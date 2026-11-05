import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

@Entity('restaurant_tables')
@Check('capacity > 0')
@Check('party_size IS NULL OR party_size > 0')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'table_number', length: 20, unique: true })
  tableNumber!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  @Index()
  status!: TableStatus;

  @Column({ name: 'customer_name', length: 120, nullable: true })
  customerName?: string | null;

  @Column({ name: 'customer_phone', length: 30, nullable: true })
  customerPhone?: string | null;

  @Column({ name: 'reservation_at', type: 'datetime', nullable: true })
  reservationAt?: Date | null;

  @Column({ name: 'party_size', type: 'int', nullable: true })
  partySize?: number | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export { Table as RestaurantTable };
