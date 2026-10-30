import { BadRequestException } from '@nestjs/common';
import { assertCanTransition } from './order-state-machine';
import { OrderStatus } from './entities/order.entity';

describe('order state machine', () => {
  it('allows only the next preparation state', () => {
    expect(() =>
      assertCanTransition(OrderStatus.PENDING, OrderStatus.PREPARING),
    ).not.toThrow();
    expect(() =>
      assertCanTransition(OrderStatus.PREPARING, OrderStatus.READY),
    ).not.toThrow();
    expect(() =>
      assertCanTransition(OrderStatus.READY, OrderStatus.SERVED),
    ).not.toThrow();
  });

  it('rejects skipped, reversed, and terminal-state transitions', () => {
    expect(() =>
      assertCanTransition(OrderStatus.PENDING, OrderStatus.READY),
    ).toThrow(BadRequestException);
    expect(() =>
      assertCanTransition(OrderStatus.SERVED, OrderStatus.PREPARING),
    ).toThrow(BadRequestException);
  });
});
