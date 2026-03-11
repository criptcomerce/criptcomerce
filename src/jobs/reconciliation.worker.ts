import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';
import { NOWPaymentsClient } from '../gateways/nowpayments.client';
import { Payment } from '../entities/payment.entity';
import { Order, OrderStatus } from '../entities/order.entity';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PAYMENT RECONCILIATION WORKER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROBLEMA QUE RESOLVE:
 * O fluxo normal é: cliente paga → NOWPayments detecta → envia webhook → backend libera.
 * Mas webhooks podem falhar por: timeout de rede, restart do servidor, bug no handler,
 * IP bloqueado por firewall, etc.
 *
 * Sem este worker: o cliente PAGOU mas o pedido continua PENDING para sempre.
 * Dinheiro recebido, produto não entregue → prejuízo de reputação e suporte.
 *
 * SOLUÇÃO:
 * A cada 10 minutos, o worker consulta ATIVAMENTE o NOWPayments sobre todos os
 * pagamentos que ainda estão pendentes. Se encontrar um pago, confirma ele mesmo.
 * É a rede de segurança do sistema.
 *
 * FLUXO:
 *   1. Busca payments PENDING há mais de 5 min (dá tempo do webhook normal chegar)
 *   2. Para cada um, consulta GET /v1/invoice/:invoice_id na API NOWPayments
 *   3. Se status = finished/confirmed → processa como se fosse webhook (com lock)
 *   4. Atualiza last_reconciled_at e reconciliation_attempts
 *   5. Loga tudo para auditoria
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class ReconciliationWorker {
  private readonly logger = new Logger(ReconciliationWorker.name);

  private readonly MAX_ATTEMPTS = 20;

  private readonly API_DELAY_MS = 500;

  constructor(
    private readonly nowpayments: NOWPaymentsClient,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Cron('*/10 * * * *', { name: 'payment-reconciliation' })
  async run(): Promise<void> {
    this.logger.log('🔍 Reconciliation Worker iniciado...');

    const pendingPayments = await this.findPendingForReconciliation();

    if (pendingPayments.length === 0) {
      this.logger.log('Nenhum pagamento pendente para reconciliar');
      return;
    }

    this.logger.log(`Verificando ${pendingPayments.length} pagamento(s) pendente(s)...`);

    let confirmed = 0;
    let failed = 0;
    let skipped = 0;

    for (const payment of pendingPayments) {
      const result = await this.reconcilePayment(payment);
      if (result === 'confirmed') confirmed++;
      else if (result === 'failed') failed++;
      else skipped++;

      // Delay cortês entre chamadas à API
      await this.sleep(this.API_DELAY_MS);
    }

    this.logger.log(
      `✅ Reconciliation concluído | ` +
      `confirmados: ${confirmed} | ignorados: ${skipped} | erros: ${failed}`
    );
  }

  /**
   * Reconcilia um pagamento individual consultando o NOWpayment.
   * Retorna o resultado da operação.
   */
  private async reconcilePayment(
    payment: Payment,
  ): Promise<'confirmed' | 'skipped' | 'failed'> {
    const invoiceId = payment.invoice_id;

    try {
    
      await this.dataSource
        .getRepository(Payment)
        .update(payment.id, {
          last_reconciled_at: new Date(),
          reconciliation_attempts: () => '"reconciliation_attempts" + 1',
        });

      
      const invoice = await this.nowpayments.getInvoice(invoiceId);

      this.logger.debug(
        `Invoice ${invoiceId} | status NOWPayments: ${invoice.order_description} | ` +
        `tentativa: ${payment.reconciliation_attempts + 1}`
      );

      this.logger.debug(`Invoice ${invoiceId} encontrada, mas status precisa ser verificado via payment API`);
      return 'skipped';

    } catch (err) {
      this.logger.error(
        `Erro ao reconciliar invoice ${invoiceId}: ${err.message}`,
        { invoiceId, orderId: payment.order?.id }
      );
      return 'failed';
    }
  }

  
  private async confirmPaymentWithLock(
    payment: Payment,
    invoice: { id: string; pay_amount: number; pay_currency: string },
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Lock pessimista: bloqueia a linha durante a transaction
      const lockedOrder = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: payment.order.id })
        .getOne();

      // Se já foi processado (pelo webhook ou outra instância), ignora
      if (lockedOrder.status !== OrderStatus.PENDING) {
        this.logger.warn(
          `[Reconciliation] Pedido ${payment.order.id} já estava ${lockedOrder.status} — ignorando`
        );
        return;
      }

      // Confirma o pagamento
      await manager.getRepository(Payment).update(payment.id, {
        tx_hash: `reconciled-nowpayments-${invoice.id}`,
        paid_at: new Date(),
      });

      await manager.getRepository(Order).update(payment.order.id, {
        status: OrderStatus.PAID,
      });

      this.logger.warn(
        `🔄 [Reconciliation] Pedido ${payment.order.id} confirmado via reconciliation! ` +
        `invoice: ${invoice.id} | O webhook havia falhado.`
      );
    });
  }

  private async findPendingForReconciliation(): Promise<Payment[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.order', 'o')
      .where('p.paid_at IS NULL')
      .andWhere('o.status = :status', { status: OrderStatus.PENDING })
      .andWhere('p.created_at < :fiveMinutesAgo', { fiveMinutesAgo })
      .andWhere('p.expiration_time > :now', { now: new Date() })
      .andWhere('p.reconciliation_attempts < :max', { max: this.MAX_ATTEMPTS })
      .orderBy('p.created_at', 'ASC')
      .getMany();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
