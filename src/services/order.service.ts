import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { NOWPaymentsClient } from '../gateways/nowpayments.client';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order, OrderStatus } from '../entities/order.entity';
import { env } from '../config/env';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly nowpayments: NOWPaymentsClient,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    this.logger.log(`Criando pedido: ${dto.amount_usd} USD em ${dto.currency}`);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const order = await this.orderRepo.create({
      amount_usd: dto.amount_usd,
      currency: dto.currency as any,
      status: OrderStatus.PENDING,
      expires_at: expiresAt,
    });

    this.logger.log(`Pedido criado: ${order.id}`);

    let invoice;
    try {
      invoice = await this.nowpayments.createInvoice({
        price_amount: dto.amount_usd,
        price_currency: 'USD',
        pay_currency: dto.currency,
        order_id: order.id,
        ipn_callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/webhooks/nowpayments`,
      });
      
      if (!invoice?.pay_address || !invoice?.pay_amount) {
        throw new Error("Invoice inválida retornada pelo gateway");
      }
    } catch (err) {
      await this.orderRepo.updateStatus(order.id, OrderStatus.EXPIRED);
      throw new BadRequestException(`Erro ao criar pagamento: ${err.message}`);
    }

    const payment = await this.paymentRepo.create({
      order: order,
      invoice_id: invoice.id.toString(),
      payment_address: invoice.pay_address,
      payment_amount: invoice.pay_amount,
      expiration_time: expiresAt,
    });

    this.logger.log(`Pagamento criado | invoice_id: ${invoice.id} | address: ${invoice.pay_address}`);

    return {
      order_id: order.id,
      address: invoice.pay_address,
      amount: invoice.pay_amount,
      currency: dto.currency,
      invoice_url: invoice.invoice_url,
      expires_at: expiresAt,
    };
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new BadRequestException('Pedido não encontrado');
    return order;
  }
}
