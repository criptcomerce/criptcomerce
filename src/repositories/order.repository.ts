import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Order, OrderStatus, OrderCurrency } from '../entities/order.entity';
import type { ListOrdersDto } from '../dto/create-order.dto';

export interface OrderListResult {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async create(data: Partial<Order>): Promise<Order> {
    const order = this.repo.create(data);
    return this.repo.save(order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.repo.update(id, { status });
  }

  async findAll(filters: ListOrdersDto): Promise<OrderListResult> {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: FindManyOptions<Order>['where'] = {};
    if (filters.status)   where['status']   = filters.status;
    if (filters.currency) where['currency'] = filters.currency;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findRecent(limit: number): Promise<Order[]> {
    return this.repo.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findPendingExpired(): Promise<Order[]> {
    return this.repo.find({ where: { status: OrderStatus.PENDING } });
  }

  async findPaidOrders(): Promise<Order[]> {
    return this.repo.find({ where: { status: OrderStatus.PAID } });
  }

  async getRevenueByCurrency(): Promise<Record<OrderCurrency, number>> {
    const rows = await this.repo
      .createQueryBuilder('o')
      .select('o.currency', 'currency')
      .addSelect('SUM(o.amount_usd)', 'total')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .groupBy('o.currency')
      .getRawMany<{ currency: OrderCurrency; total: string }>();

    const result: Record<OrderCurrency, number> = {
      [OrderCurrency.BTC]:  0,
      [OrderCurrency.USDT]: 0,
      [OrderCurrency.ETH]:  0,
    };
    for (const row of rows) result[row.currency] = Number(row.total);
    return result;
  }

  async getStats() {
    const [total, paid, pending, expired, partial] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: OrderStatus.PAID } }),
      this.repo.count({ where: { status: OrderStatus.PENDING } }),
      this.repo.count({ where: { status: OrderStatus.EXPIRED } }),
      this.repo.count({ where: { status: OrderStatus.PARTIAL } }),
    ]);

    const revenueRow = await this.repo
      .createQueryBuilder('o')
      .select('SUM(o.amount_usd)', 'total')
      .where('o.status = :status', { status: OrderStatus.PAID })
      .getRawOne<{ total: string }>();

    const revenueByCurrency = await this.getRevenueByCurrency();

    return {
      total_revenue_usd:   Number(revenueRow?.total ?? 0),
      total_orders:        total,
      paid_orders:         paid,
      pending_orders:      pending,
      expired_orders:      expired,
      partial_orders:      partial,
      revenue_by_currency: revenueByCurrency,
    };
  }
}
