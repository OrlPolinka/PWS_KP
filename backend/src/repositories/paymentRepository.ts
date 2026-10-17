import { getTransactionClient, query } from '../config/database';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

interface PaymentRecord {
  id: string;
  user_id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider_payment_id: string | null;
  metadata: {
    membership_type_id?: number;
    price_byn?: string;
    duration_days?: number;
    visit_count?: number | null;
  };
}

export class PaymentRepository {
  static async createMembershipPayment(
    userId: string,
    amount: number,
    currency: 'USD' | 'BYN',
    provider: 'stripe' | 'mock',
    membershipTypeId: number,
    priceByn: number,
    durationDays: number,
    visitCount: number | null,
    description: string | null
  ) {
    const result = await query(
      `INSERT INTO payments (user_id, amount, currency, status, provider, description, metadata)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING id`,
      [
        userId,
        amount,
        currency,
        provider,
        description,
        JSON.stringify({
          membership_type_id: membershipTypeId,
          price_byn: priceByn.toFixed(2),
          duration_days: durationDays,
          visit_count: visitCount,
        }),
      ]
    );
    return result.rows[0] as { id: string };
  }

  static async setCheckoutSession(paymentId: string, sessionId: string): Promise<void> {
    await query(
      `UPDATE payments
       SET provider_payment_id = $1
       WHERE id = $2 AND provider = 'stripe' AND status = 'pending'`,
      [sessionId, paymentId]
    );
  }

  static async markFailed(paymentId: string): Promise<void> {
    await query(
      `UPDATE payments
       SET status = 'failed'
       WHERE id = $1 AND provider = 'stripe' AND status = 'pending'`,
      [paymentId]
    );
  }

  static async findStatus(
    paymentId: string,
    userId: string
  ): Promise<{ status: PaymentStatus; provider: string } | null> {
    const result = await query(
      'SELECT status, provider FROM payments WHERE id = $1 AND user_id = $2 AND provider IN ($3, $4)',
      [paymentId, userId, 'stripe', 'mock']
    );
    return result.rows[0] || null;
  }

  static async processPaymentResult(
    paymentId: string,
    provider: 'stripe' | 'mock',
    providerPaymentId: string,
    status: 'succeeded' | 'failed',
    amountInMinorUnits?: number,
    currency?: string,
    userId?: string
  ): Promise<void> {
    const client = await getTransactionClient();
    try {
      await client.query('BEGIN');
      const paymentResult = await client.query<PaymentRecord>(
        `SELECT id, user_id, amount, currency, status, provider_payment_id, metadata
         FROM payments
         WHERE id = $1 AND provider = $2
           AND ($3::uuid IS NULL OR user_id = $3)
         FOR UPDATE`,
        [paymentId, provider, userId || null]
      );
      const payment = paymentResult.rows[0];
      if (!payment) throw new Error('Payment not found');

      if (payment.provider_payment_id && payment.provider_payment_id !== providerPaymentId) {
        throw new Error('Payment provider reference does not match');
      }

      if (payment.status !== 'pending') {
        await client.query('COMMIT');
        return;
      }

      if (status === 'succeeded') {
        if (provider === 'stripe') {
          if (
            amountInMinorUnits !== Math.round(Number(payment.amount) * 100) ||
            currency?.toUpperCase() !== payment.currency
          ) {
            throw new Error('Stripe payment amount or currency does not match');
          }
        } else if (payment.currency !== 'BYN') {
          throw new Error('Local test payment must use BYN');
        }

        const membershipTypeId = Number(payment.metadata?.membership_type_id);
        const durationDays = Number(payment.metadata?.duration_days);
        const priceByn = Number(payment.metadata?.price_byn);
        const visitCount = payment.metadata?.visit_count;
        if (
          !Number.isInteger(membershipTypeId) ||
          membershipTypeId <= 0 ||
          !Number.isInteger(durationDays) ||
          durationDays <= 0 ||
          !Number.isFinite(priceByn) ||
          priceByn < 0 ||
          (visitCount !== null && (!Number.isInteger(visitCount) || visitCount! < 0))
        ) {
          throw new Error('Payment has invalid membership details');
        }

        const membershipResult = await client.query(
          `INSERT INTO memberships (
             client_id, membership_type_id, payment_id, start_date, end_date,
             remaining_visits, status, price_paid
           )
           VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + $4::integer, $5, 'active', $6)
           RETURNING id`,
          [
            payment.user_id,
            membershipTypeId,
            payment.id,
            durationDays,
            visitCount,
            priceByn,
          ]
        );
        if (membershipResult.rowCount !== 1) throw new Error('Failed to create membership');
      }

      await client.query(
        `UPDATE payments
         SET status = $1,
             provider_payment_id = COALESCE(provider_payment_id, $2)
         WHERE id = $3`,
        [status, providerPaymentId, paymentId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
