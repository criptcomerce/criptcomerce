import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ nullable: true })
  tx_hash: string;

  @Column()
  destination_wallet: string; 

  @Column({ type: 'timestamp' })
  executed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
