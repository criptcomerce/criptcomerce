import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID    = 'PAID',
  EXPIRED = 'EXPIRED',
  PARTIAL = 'PARTIAL',
}

export enum OrderCurrency {
  BTC  = 'BTC',
  USDT = 'USDT',
  ETH  = 'ETH',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_email: string;

  @Column({ type: 'text', nullable: true })
  shipping_address: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount_usd: number;

  @Column({ type: 'enum', enum: OrderCurrency })
  currency: OrderCurrency;

  @Column({ nullable: true })
  coingate_invoice_id: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
