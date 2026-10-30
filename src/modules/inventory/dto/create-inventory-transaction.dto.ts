import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryTxType } from '../entities/inventory-transaction.entity';

export class CreateInventoryTransactionDto {
  @IsIn([InventoryTxType.IMPORT, InventoryTxType.EXPORT])
  type: InventoryTxType.IMPORT | InventoryTxType.EXPORT;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
