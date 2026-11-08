import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],

  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],

  [OrderStatus.READY]: [OrderStatus.SERVED],

  [OrderStatus.SERVED]: [],

  [OrderStatus.CANCELLED]: [],
};

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  const validStatuses = Object.values(OrderStatus);

  if (!validStatuses.includes(from)) {
    throw new BadRequestException(
      'Trạng thái hiện tại của đơn hàng không hợp lệ',
    );
  }

  if (!validStatuses.includes(to)) {
    throw new BadRequestException('Trạng thái đơn hàng mới không hợp lệ');
  }

  const allowedTransitions = ORDER_TRANSITIONS[from];

  if (!allowedTransitions.includes(to)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái từ ${from} sang ${to}. ` +
        `Trạng thái được phép: ${allowedTransitions.join(', ') || 'không có'}`,
    );
  }
}
