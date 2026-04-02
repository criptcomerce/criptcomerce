import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ unique: true })
  invoice_id: string;

  @Column()
  payment_address: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  payment_amount: number;

  @Column({ type: 'timestamp' })
  expiration_time: Date;

  @Column()
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({ default: 0 })
  reconciliation_attempts: number;

  @Column({ nullable: true, type: 'timestamp' })
  last_reconciled_at: Date;

  @Column({ nullable: true })
  invoice_url: string;

  @Column({ nullable: true })
  tx_hash: string;

  @Column({ nullable: true, type: 'timestamp' })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
