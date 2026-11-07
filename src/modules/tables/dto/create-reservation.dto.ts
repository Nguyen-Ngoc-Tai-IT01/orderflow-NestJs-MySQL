import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @IsDateString()
  reservationAt!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  partySize!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
