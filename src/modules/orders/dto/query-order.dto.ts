import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class QueryOrderDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 10;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['createdAt', 'totalAmount']) sortBy = 'createdAt';
  @IsOptional() @IsIn(['ASC', 'DESC']) order: 'ASC' | 'DESC' = 'DESC';
}
