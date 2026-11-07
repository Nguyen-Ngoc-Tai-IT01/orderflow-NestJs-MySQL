import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTableDto } from './create-table.dto';
import { TableStatus } from '../entities/restaurant-table.entity';

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
