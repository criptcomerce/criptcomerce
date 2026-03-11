import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { OrderStatus } from '../entities/order.entity';

@Injectable()
export class ExpireOrdersJob {
  private readonly logger = new Logger(ExpireOrdersJob.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  
  //  Executa a cada 5 minutos.

  @Cron('*/5 * * * *', { name: 'expire-orders' })
  async run(): Promise<void> {
    this.logger.log('Verificando pedidos expirados...');

    // Busca pagamentos cujo expiration_time já passou e não foram pagos
    const expiredPayments = await this.paymentRepo.findExpiredPending();

    if (expiredPayments.length === 0) {
      return;
    }

    this.logger.log(`${expiredPayments.length} pedido(s) a expirar`);

    for (const payment of expiredPayments) {
      const order = payment.order;

      if (order.status === OrderStatus.PENDING) {
        await this.orderRepo.updateStatus(order.id, OrderStatus.EXPIRED);
        this.logger.log(`Pedido expirado: ${order.id}`);
      }
    }
  }
}
