import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Menu } from '../menu/entities/menu.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Order),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: { createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(Menu),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
