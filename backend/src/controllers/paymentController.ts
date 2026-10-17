import { Request, Response } from 'express';
import { PaymentService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class PaymentController {
  static async createMembershipCheckout(req: Request, res: Response) {
    try {
      const membershipTypeId = Number(req.body.membership_type_id);
      if (!Number.isInteger(membershipTypeId) || membershipTypeId <= 0) {
        throw new AppError(400, 'Укажите корректный тип абонемента.');
      }

      const checkout = await PaymentService.createMembershipCheckout(req.user!.userId, membershipTypeId);
      res.status(201).json(checkout);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      console.error('Failed to create Stripe Checkout session:', error);
      throw new AppError(502, error.message || 'Не удалось создать платежную сессию Stripe.');
    }
  }

  static async getStatus(req: Request, res: Response) {
    try {
      const status = await PaymentService.getPaymentStatus(req.params.id, req.user!.userId);
      res.json(status);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async completeLocalTestPayment(req: Request, res: Response) {
    const outcome = req.params.outcome;
    if (outcome !== 'complete' && outcome !== 'cancel') {
      throw new AppError(400, 'Некорректный результат тестовой оплаты.');
    }

    try {
      await PaymentService.completeLocalTestPayment(
        req.params.id,
        req.user!.userId,
        outcome === 'complete' ? 'succeeded' : 'failed'
      );
      res.json({ status: outcome === 'complete' ? 'succeeded' : 'failed' });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Payment not found') {
        throw new AppError(404, 'Платёж не найден.');
      }
      console.error('Failed to complete local test payment:', error);
      if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
        throw new AppError(500, `Не удалось завершить оплату: ${error.message}`);
      }
      throw new AppError(500, 'Не удалось завершить тестовую оплату.');
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    let event;
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new Error('Expected raw Stripe webhook body');
      }
      event = PaymentService.constructWebhookEvent(req.body, req.header('stripe-signature'));
    } catch (error: any) {
      throw new AppError(400, `Stripe webhook signature verification failed: ${error.message}`);
    }

    try {
      await PaymentService.processWebhookEvent(event);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Failed to process Stripe webhook event:', error);
      throw new AppError(500, 'Failed to process Stripe webhook event');
    }
  }
}
