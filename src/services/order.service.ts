import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderRepository }   from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { UserService }       from './user.service';
import { NOWPaymentsClient } from '../gateways/nowpayments.client';
import { CreateOrderDto, ListOrdersDto, RecentOrdersDto } from '../dto/create-order.dto';
import { Order, OrderStatus } from '../entities/order.entity';
import { env } from '../config/env';
import { ProductRepository } from '../repositories/product.repository';

const HIGH_VALUE_THRESHOLD_USD = 1000;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepo:    OrderRepository,
    private readonly paymentRepo:  PaymentRepository,
    private readonly userService:  UserService,
    private readonly nowpayments:  NOWPaymentsClient,
    private readonly productRepo:  ProductRepository,
  ) {}

  /**
   * userId vem do JWT (extraído pelo guard) — nunca do body do request.
   * amount_usd vem do body (pode ser adaptado para vir de produto futuramente).
   */
  async createOrder(userId: string | null, dto: CreateOrderDto) {
    const user = userId ? await this.userService.findById(userId) : null;

    let amount_usd: number;

    if (dto.product_id) {
      const product = await this.productRepo.findByIdOrFail(dto.product_id);
      if (!product.active) throw new BadRequestException('Produto indisponível');
      amount_usd = Number(product.price_usd);
      this.logger.log(`[ORDER] Preço do produto "${product.name}": $${amount_usd}`);
    } else if (dto.amount_usd) {
      amount_usd = Number(dto.amount_usd);
    } else {
      throw new BadRequestException('Informe product_id ou amount_usd');
    }

    if (amount_usd >= HIGH_VALUE_THRESHOLD_USD) {
      this.logger.warn(`⚠️  Alto valor: $${amount_usd} | user: ${userId}`);
    }

    this.logger.log(
      `[ORDER] Criando | user: ${user?.email ?? 'guest'} | $${amount_usd} ${dto.currency}`,
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const order = await this.orderRepo.create({
      user,
      amount_usd,
      currency:         dto.currency as any,
      status:           OrderStatus.PENDING,
      expires_at:       expiresAt,
      customer_name:    dto.customer_name    ?? user?.name,
      customer_email:   dto.customer_email   ?? user?.email,
      shipping_address: dto.shipping_address,
    });

    this.logger.log(`[ORDER] Criado | id: ${order.id}`);

    let invoice: any;
    try {
      invoice = await this.nowpayments.createInvoice({
        price_amount:    amount_usd,
        price_currency:  'USD',
        pay_currency:    dto.currency,
        order_id:        order.id,
        ipn_callback_url: `${env.BASE_URL}/webhooks/nowpayments`,
      });

      this.logger.log(`Invoice recebida: ${JSON.stringify(invoice)}`);

      if (!invoice?.invoice_url) {
        throw new Error('Invoice inválida: URL não encontrada');
      }
    } catch (err) {
      await this.orderRepo.updateStatus(order.id, OrderStatus.EXPIRED);
      this.logger.error(`[ORDER] Falha invoice | order: ${order.id} | ${err.message}`);
      throw new BadRequestException(`Erro ao criar pagamento: ${err.message}`);
    }

    const paymentAddress = invoice.pay_address || 'pending';
  const paymentAmount = parseFloat(invoice.pay_amount) || parseFloat(invoice.price_amount) || amount_usd;

    await this.paymentRepo.create({
      order,
      invoice_id:      invoice.id.toString(),
      payment_address: paymentAddress,
      payment_amount:  paymentAmount,
      currency:        dto.currency,
      expiration_time: expiresAt,
      invoice_url:     invoice.invoice_url ?? null,
    });

    this.logger.log(`[PAYMENT] Criado | invoice: ${invoice.id}`);

    return {
      order_id:    order.id,
      address:     paymentAddress,
      amount:      paymentAmount,
      amount_usd,
      currency:    dto.currency,
      invoice_url: invoice.invoice_url,
      expires_at:  expiresAt,
    };
  }

  async listOrders(filters: ListOrdersDto) {
    return this.orderRepo.findAll(filters);
  }

  async getOrderWithPayment(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');
    const payment = await this.paymentRepo.findByOrderId(id);
    return { order, payment: payment ?? null };
  }

  async getRecentOrders(dto: RecentOrdersDto) {
    return this.orderRepo.findRecent(dto.limit ?? 10);
  }

  async getDashboardStats() {
    return this.orderRepo.getStats();
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }
}
