import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrderStatus } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { Order } from '../entities/order.entity';

export interface WebhookPayload {
  id: string;             // invoice_id
  status: string;         // paid | confirmed | invalid | expired | canceled
  price_amount: number;
  price_currency: string;
  receive_currency: string;
  receive_amount: number;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  token: string;
  underpaid_amount?: number;
  overpaid_amount?: number;
  is_refundable?: boolean;
}

export interface PaymentConfirmedData {
  invoice_id: string;
  order_id: string;
  status: string;
  amount_paid: number;
  currency: string;
  tx_hash?: string;
}

export interface PaymentFailedData {
  invoice_id: string;
  order_id: string;
  reason: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // Cache simples para idempotência (produção: usar Redis)
  private readonly processedWebhooks = new Set<string>();

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async processWebhook(payload: WebhookPayload, txHash?: string): Promise<void> {
    const invoiceId = payload.id.toString();

    // Idempotência: evitar processar webhook duplicado
    const dedupeKey = `${invoiceId}:${payload.status}`;
    if (this.processedWebhooks.has(dedupeKey)) {
      this.logger.warn(`Webhook duplicado ignorado: ${dedupeKey}`);
      return;
    }

    this.logger.log(`Processando webhook | invoice: ${invoiceId} | status: ${payload.status}`);

    await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('payment.order', 'order')
        .where('payment.invoice_id = :invoiceId', { invoiceId })
        .getOne();

      if (!payment) {
        this.logger.error(`Pagamento não encontrado para invoice_id: ${invoiceId}`);
        return;
      }

      const order = payment.order;

      const lockedOrder = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: order.id })
        .getOne();

      if (order.status !== OrderStatus.PENDING) {
        this.logger.warn(`Pedido ${order.id} já processado (status: ${order.status})`);
        this.processedWebhooks.add(dedupeKey);
        return;
      }

      const expectedAmount = Number(payment.payment_amount);
      const receivedAmount = Number(payload.receive_amount ?? payload.pay_amount ?? 0);
      const tolerance = 0.00001;

      if (receivedAmount < expectedAmount - tolerance) {
        this.logger.warn(
          `⚠️  Pagamento abaixo do esperado | ` +
          `invoice: ${invoiceId} | ` +
          `esperado: ${expectedAmount} | ` +
          `recebido: ${receivedAmount}`
        );
        this.processedWebhooks.add(dedupeKey);
        return;
      }

      await manager.getRepository(Payment).update(payment.id, {
        tx_hash: txHash || `coingate-${invoiceId}`,
        paid_at: new Date(),
      });

      await manager.getRepository(Order).update(order.id, {
        status: OrderStatus.PAID,
      });

      this.logger.log(
        `✅ Pedido ${order.id} marcado como PAGO | ` +
        `recebido: ${receivedAmount} ${payload.receive_currency}`
      );

      this.processedWebhooks.add(dedupeKey);
    });
  }

  /**
   * Handler para pagamento confirmado (NOWPayments)
   */
  async handlePaymentConfirmed(data: PaymentConfirmedData): Promise<void> {
    const { invoice_id, order_id, amount_paid, currency, tx_hash } = data;

    const dedupeKey = `${order_id}:confirmed`;
    if (this.processedWebhooks.has(dedupeKey)) {
      this.logger.warn(`Webhook duplicado ignorado: ${dedupeKey}`);
      return;
    }

    this.logger.log(`Processando pagamento confirmado | order: ${order_id} | invoice: ${invoice_id}`);

    await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('payment.order', 'order')
        .where('order.id = :orderId', { orderId: order_id })
        .getOne();

      if (!payment) {
        this.logger.error(`Pagamento não encontrado para invoice_id: ${invoice_id}`);
        return;
      }

      const order = payment.order;

      if (order.status !== OrderStatus.PENDING) {
        this.logger.warn(`Pedido ${order.id} já processado (status: ${order.status})`);
        this.processedWebhooks.add(dedupeKey);
        return;
      }

      const expectedAmount = Number(payment.payment_amount);
      const receivedAmount = Number(amount_paid);
      const tolerance      = 0.00001;

      if (receivedAmount < expectedAmount - tolerance) {
        // Underpayment: marca como PARTIAL
        await manager.getRepository(Payment).update(payment.id, {
          tx_hash: tx_hash || `nowpayments-${invoice_id}`,
          paid_at: new Date(),
          status: 'CONFIRMED' as any,
        });
        await manager.getRepository(Order).update(order.id, {
          status: OrderStatus.PARTIAL,
        });
        this.logger.warn(
          `⚠️  [WEBHOOK] Underpayment | order: ${order.id} | esperado: ${expectedAmount} | recebido: ${receivedAmount} ${currency}`
        );
        this.processedWebhooks.add(dedupeKey);
        return;
      }

      await manager.getRepository(Payment).update(payment.id, {
        tx_hash: tx_hash || `nowpayments-${invoice_id}`,
        paid_at: new Date(),
        status: 'CONFIRMED' as any,
      });

      await manager.getRepository(Order).update(order.id, {
        status: OrderStatus.PAID,
      });

      this.logger.log(
        `✅ [PAYMENT] Confirmado | order: ${order.id} | recebido: ${amount_paid} ${currency}`
      );

      this.processedWebhooks.add(dedupeKey);
    });
  }

  /**
   * Handler para pagamento falho (NOWPayments)
   */
  async handlePaymentFailed(data: PaymentFailedData): Promise<void> {
    const { invoice_id, order_id, reason } = data;

    const dedupeKey = `${order_id}:failed`;
    if (this.processedWebhooks.has(dedupeKey)) {
      this.logger.warn(`Webhook duplicado ignorado: ${dedupeKey}`);
      return;
    }

    this.logger.log(`Processando pagamento falho | order: ${order_id} | reason: ${reason}`);

    await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('payment.order', 'order')
        .where('order.id = :orderId', { orderId: order_id })
        .getOne();

      if (!payment) {
        this.logger.error(`Pagamento não encontrado para invoice_id: ${invoice_id}`);
        return;
      }

      const order = payment.order;

      if (order.status !== OrderStatus.PENDING) {
        this.logger.warn(`Pedido ${order.id} já estava em status: ${order.status}`);
        this.processedWebhooks.add(dedupeKey);
        return;
      }

      await manager.getRepository(Order).update(order.id, {
        status: OrderStatus.EXPIRED,
      });

      this.logger.log(`❌ Pedido ${order.id} marcado como EXPIRED | reason: ${reason}`);

      this.processedWebhooks.add(dedupeKey);
    });
  }
}
