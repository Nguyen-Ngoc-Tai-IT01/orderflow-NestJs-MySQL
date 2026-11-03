<<<<<<< HEAD
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID() menuItemId: string;
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() note?: string;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() tableNumber: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() note?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
=======
export class CreateOrderDto {}
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
