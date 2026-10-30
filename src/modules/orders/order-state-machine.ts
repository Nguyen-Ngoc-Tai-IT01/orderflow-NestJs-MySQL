import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from './entities/order.entity';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.SERVED],
  [OrderStatus.SERVED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  if (!ORDER_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái từ ${from} sang ${to}. Cho phép: ${ORDER_TRANSITIONS[from].join(', ') || 'không có'}`,
    );
  }
}
