import { IsEnum, IsOptional } from 'class-validator';
import { TableStatus } from '../entities/restaurant-table.entity';

export class QueryTablesDto {
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
