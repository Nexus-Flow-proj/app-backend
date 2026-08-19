import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subscription } from './subscription.entity';

export enum PaymentStatus {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PENDING = 'PENDING',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId!: string | null;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription | null;

  @Index()
  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', nullable: true })
  stripePaymentIntentId!: string | null;

  @Index()
  @Column({ name: 'stripe_invoice_id', type: 'varchar', nullable: true })
  stripeInvoiceId!: string | null;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ type: 'varchar', default: 'usd' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ name: 'invoice_url', type: 'varchar', nullable: true })
  invoiceUrl!: string | null;

  @Column({ name: 'receipt_url', type: 'varchar', nullable: true })
  receiptUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
