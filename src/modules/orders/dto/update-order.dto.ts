import { IsEnum } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn hàng không hợp lệ',
  })
  status!: OrderStatus;
}
