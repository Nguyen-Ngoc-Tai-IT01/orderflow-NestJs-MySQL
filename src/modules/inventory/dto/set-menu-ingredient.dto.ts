import { IsNumber, Min } from 'class-validator';

export class SetMenuIngredientDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityPerUnit: number;
}
