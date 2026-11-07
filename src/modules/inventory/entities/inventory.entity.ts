import {
  Column,
  Check,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';

@Entity('inventories')
@Check('quantity >= 0')
@Check('min_quantity >= 0')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  unit!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    default: 0,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({
    name: 'min_quantity',
    type: 'numeric',
    precision: 12,
    scale: 3,
    default: 0,
    transformer: decimalTransformer,
  })
  minQuantity!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
