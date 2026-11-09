import {
  Column,
  Check,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';
import { Order } from './order.entity';

@Entity('order_items')
@Check('unit_price >= 0 AND quantity > 0')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @Column()
  name: string;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ nullable: true })
  note?: string;

  // Lưu ảnh tại thời điểm tạo đơn
  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;
}
