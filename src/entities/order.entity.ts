import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
}

export enum OrderCurrency {
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount_usd: number;

  @Column({ type: 'enum', enum: OrderCurrency })
  currency: OrderCurrency;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ nullable: true })
  coingate_invoice_id: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
