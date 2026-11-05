import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  @MaxLength(150)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Giá tiền không được nhỏ hơn 0' })
  price!: number;

  @IsString()
  @IsNotEmpty({ message: 'Phân loại không được để trống' })
  @MaxLength(50)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
