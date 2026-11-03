<<<<<<< HEAD
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../../../common/transformers';

@Entity('menu_items')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  price: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;
}
=======
export class Menu {}
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
