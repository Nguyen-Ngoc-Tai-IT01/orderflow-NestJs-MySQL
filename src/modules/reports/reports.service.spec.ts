import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const orderRepository = { createQueryBuilder: jest.fn() };
  const orderItemRepository = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Order), useValue: orderRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('groups revenue by the requested period and returns numeric values', async () => {
    const builder = createQueryBuilder({
      getRawMany: jest
        .fn()
        .mockResolvedValue([
          { period: '2026-11-05', revenue: '125.50', orderCount: '3' },
        ]),
    });
    orderRepository.createQueryBuilder.mockReturnValue(builder);

    await expect(
      service.getRevenue({ period: 'day', from: '2026-11-01' }),
    ).resolves.toEqual([
      { period: '2026-11-05', revenue: 125.5, orderCount: 3 },
    ]);
    expect(builder.groupBy).toHaveBeenCalled();
  });

  it('counts cancelled orders and applies inclusive date filters', async () => {
    const builder = createQueryBuilder({
      getCount: jest.fn().mockResolvedValue(4),
    });
    orderRepository.createQueryBuilder.mockReturnValue(builder);

    await expect(
      service.getCancelledOrders({
        from: '2026-11-01',
        to: '2026-11-05',
      }),
    ).resolves.toEqual({ total: 4 });
    expect(builder.andWhere).toHaveBeenNthCalledWith(
      2,
      'order.createdAt < :to',
      { to: '2026-11-06 00:00:00' },
    );
  });

  it('joins menu names when ranking served items', async () => {
    const builder = createQueryBuilder({
      getRawMany: jest.fn().mockResolvedValue([
        {
          menuItemId: 'item-id',
          name: 'Cơm gà',
          quantity: '8',
          revenue: '80',
        },
      ]),
    });
    orderItemRepository.createQueryBuilder.mockReturnValue(builder);

    await expect(service.getTopItems({ limit: 5 })).resolves.toEqual([
      { menuItemId: 'item-id', name: 'Cơm gà', quantity: 8, revenue: 80 },
    ]);
    expect(builder.innerJoin).toHaveBeenCalledWith('item.order', 'order');
    expect(builder.leftJoin).toHaveBeenCalled();
    expect(builder.take).toHaveBeenCalledWith(5);
  });

  it('rejects reversed date ranges before querying', async () => {
    await expect(
      service.getCancelledOrders({
        from: '2026-11-06',
        to: '2026-11-05',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orderRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});

function createQueryBuilder(overrides: Record<string, jest.Mock> = {}) {
  const builder: Record<string, jest.Mock> = {
    addGroupBy: jest.fn(),
    addOrderBy: jest.fn(),
    addSelect: jest.fn(),
    andWhere: jest.fn(),
    createQueryBuilder: jest.fn(),
    groupBy: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    select: jest.fn(),
    take: jest.fn(),
    where: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    ...overrides,
  };
  for (const method of [
    'addGroupBy',
    'addOrderBy',
    'addSelect',
    'andWhere',
    'groupBy',
    'innerJoin',
    'leftJoin',
    'orderBy',
    'select',
    'take',
    'where',
  ]) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}
