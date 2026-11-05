import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
<<<<<<< HEAD
=======
export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6
