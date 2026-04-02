import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async create(data: Partial<Payment>): Promise<Payment> {
    const payment = this.repo.create(data);
    return this.repo.save(payment);
  }

  async findAll(): Promise<Payment[]> {
  return this.repo.find({
    relations: ['order'],
    order: { created_at: 'DESC' },
  });
}

async findById(id: string): Promise<Payment | null> {
  return this.repo.findOne({ where: { id }, relations: ['order'] });
}

  async findByInvoiceId(invoice_id: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { invoice_id } });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.repo.findOne({
      where: { order: { id: orderId } },
    });
  }

  async updatePaid(id: string, tx_hash: string): Promise<void> {
    await this.repo.update(id, {
      tx_hash,
      paid_at: new Date(),
    });
  }

  async findExpiredPending(): Promise<Payment[]> {
    return this.repo.find({
      where: {
        expiration_time: LessThan(new Date()),
        paid_at: null,
      },
    });
  }

  async findPaidWithAddresses(currency: string): Promise<Payment[]> {
    return this.repo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.order', 'o')
      .where('o.currency = :currency', { currency })
      .andWhere('o.status = :status', { status: 'PAID' })
      .andWhere('p.payment_address IS NOT NULL')
      .getMany();
  }
}
