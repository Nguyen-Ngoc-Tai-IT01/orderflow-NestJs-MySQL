import {
  Column,
  Check,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('menu_item_ingredients')
@Check('quantity_per_unit > 0')
@Unique(['menuItemId', 'inventoryId'])
export class MenuItemIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @Column({ name: 'inventory_id' })
  inventoryId: string;

  @ManyToOne(() => Inventory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({
    name: 'quantity_per_unit',
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: decimalTransformer,
  })
  quantityPerUnit: number;
}
