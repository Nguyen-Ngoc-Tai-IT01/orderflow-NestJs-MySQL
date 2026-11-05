import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150, unique: true })
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  price!: number;

  @Column({ length: 50, default: 'Main' })
  @Index()
  category!: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'is_available', default: true })
  @Index()
  isAvailable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export { MenuItem as Menu };
