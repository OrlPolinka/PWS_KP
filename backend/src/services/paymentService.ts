import Stripe from 'stripe';
import { config } from '../config';
import { MembershipTypeRepository, PaymentRepository, UserRepository } from '../repositories';

interface NbrbRate {
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_OfficialRate: number;
  Date: string;
}

interface CachedUsdRate {
  bynPerUsd: number;
  date: string;
  expiresAt: number;
}

export class PaymentService {
  private static cachedUsdRate: CachedUsdRate | null = null;

  private static getStripe(): Stripe {
    if (!config.stripe.secretKey.startsWith('sk_test_')) {
      throw new Error('Stripe test mode requires a test secret key with the sk_test_ prefix.');
    }
    return new Stripe(config.stripe.secretKey);
  }

  private static async getNbrbUsdRate(): Promise<{ bynPerUsd: number; date: string }> {
    if (this.cachedUsdRate && this.cachedUsdRate.expiresAt > Date.now()) {
      return this.cachedUsdRate;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch('https://api.nbrb.by/exrates/rates?periodicity=0', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`NBRB exchange-rate request failed with status ${response.status}`);
      }

      const rates = await response.json() as NbrbRate[];
      const usdRate = rates.find((rate) => rate.Cur_Abbreviation === 'USD');
      if (
        !usdRate ||
        !Number.isFinite(usdRate.Cur_OfficialRate) ||
        !Number.isFinite(usdRate.Cur_Scale) ||
        usdRate.Cur_Scale <= 0
      ) {
        throw new Error('NBRB USD exchange rate is unavailable or invalid');
      }

      const result: CachedUsdRate = {
        bynPerUsd: usdRate.Cur_OfficialRate / usdRate.Cur_Scale,
        date: usdRate.Date.slice(0, 10),
        expiresAt: Date.now() + 30 * 60 * 1000,
      };
      this.cachedUsdRate = result;
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  static async createMembershipCheckout(userId: string, membershipTypeId: number) {
    const user = await UserRepository.findById(userId);
    if (!user || user.role !== 'client' || !user.is_active) {
      throw new Error('Active client account required');
    }

    const membershipType = await MembershipTypeRepository.findById(membershipTypeId);
    if (!membershipType || !membershipType.is_active) {
      throw new Error('Active membership type not found');
    }

    const priceByn = Number(membershipType.price);
    if (!Number.isFinite(priceByn) || priceByn <= 0) {
      throw new Error('Membership price must be a positive amount');
    }

    if (config.stripe.mode === 'mock') {
      const payment = await PaymentRepository.createMembershipPayment(
        userId,
        priceByn,
        'BYN',
        'mock',
        membershipTypeId,
        priceByn,
        membershipType.duration_days,
        membershipType.visit_count ?? null,
        'Локальная тестовая оплата. Денежные средства не списываются.'
      );
      return {
        mode: 'mock' as const,
        payment_id: payment.id,
        amount: priceByn,
        currency: 'BYN' as const,
      };
    }

    if (!config.stripe.webhookSecret) {
      throw new Error('Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET.');
    }
    const stripe = this.getStripe();
    const rate = await this.getNbrbUsdRate();
    const amountUsdCents = Math.round((priceByn / rate.bynPerUsd) * 100);
    if (amountUsdCents < 50) {
      throw new Error('Converted price is below Stripe minimum of 0.50 USD');
    }

    const amountUsd = amountUsdCents / 100;
    const description =
      `Цена абонемента: ${priceByn.toFixed(2)} BYN. ` +
      `Пересчитано в USD по курсу НБРБ на ${rate.date}: 1 USD = ${rate.bynPerUsd.toFixed(4)} BYN.`;
    const payment = await PaymentRepository.createMembershipPayment(
      userId,
      amountUsd,
      'USD',
      'stripe',
      membershipTypeId,
      priceByn,
      membershipType.duration_days,
      membershipType.visit_count ?? null,
      description
    );
    const frontendUrl = config.stripe.frontendUrl.replace(/\/+$/, '');

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${membershipType.name} (${priceByn.toFixed(2)} BYN)`,
              description,
            },
            unit_amount: amountUsdCents,
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}/memberships?payment_id=${encodeURIComponent(payment.id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/memberships?payment_id=${encodeURIComponent(payment.id)}&payment_result=cancelled`,
        customer_email: user.email,
        metadata: {
          payment_id: payment.id,
          user_id: userId,
          membership_type_id: String(membershipTypeId),
        },
      });

      if (!session.url) throw new Error('Stripe did not return a Checkout URL');
      await PaymentRepository.setCheckoutSession(payment.id, session.id);
      return { mode: 'stripe' as const, payment_id: payment.id, session_id: session.id, url: session.url };
    } catch (error) {
      await PaymentRepository.markFailed(payment.id);
      throw error;
    }
  }

  static async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await PaymentRepository.findStatus(paymentId, userId);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  static async completeLocalTestPayment(
    paymentId: string,
    userId: string,
    status: 'succeeded' | 'failed'
  ): Promise<void> {
    if (config.stripe.mode !== 'mock' || config.nodeEnv === 'production') {
      throw new Error('Local test payments are disabled');
    }
    await PaymentRepository.processPaymentResult(
      paymentId,
      'mock',
      `local-test:${paymentId}`,
      status,
      undefined,
      undefined,
      userId
    );
  }

  static constructWebhookEvent(payload: Buffer, signature: string | undefined): Stripe.Event {
    if (!config.stripe.webhookSecret) {
      throw new Error('Stripe is not configured. Set STRIPE_WEBHOOK_SECRET.');
    }
    if (!signature) throw new Error('Missing Stripe signature');
    return this.getStripe().webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
  }

  static async processWebhookEvent(event: Stripe.Event): Promise<void> {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== 'paid') return;

      const paymentId = session.metadata?.payment_id;
      if (!paymentId || !session.id || session.amount_total === null || !session.currency) {
        throw new Error('Stripe Checkout session is missing required payment data');
      }

      await PaymentRepository.processPaymentResult(
        paymentId,
        'stripe',
        session.id,
        'succeeded',
        session.amount_total,
        session.currency
      );
      return;
    }

    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.payment_id;
      if (!paymentId) throw new Error('Stripe Checkout session has no payment ID');
      await PaymentRepository.processPaymentResult(paymentId, 'stripe', session.id, 'failed');
    }
  }
}
