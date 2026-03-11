import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';

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

  async findPendingExpired(): Promise<Order[]> {
    return this.repo.find({
      where: {
        status: OrderStatus.PENDING,
      },
    });
  }

  async findPaidOrders(): Promise<Order[]> {
    return this.repo.find({
      where: { status: OrderStatus.PAID },
    });
  }
}
