import {
  CreateDateColumn,
  Column,
  Check,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';
import { Inventory } from './inventory.entity';

export enum InventoryTxType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  ORDER_DEDUCT = 'ORDER_DEDUCT',
  ORDER_RESTORE = 'ORDER_RESTORE',
}

@Entity('inventory_transactions')
@Check('quantity > 0')
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inventory, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ type: 'enum', enum: InventoryTxType })
  type: InventoryTxType;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: decimalTransformer,
  })
  quantity: number;

  @Column({ name: 'order_id', nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;
}
