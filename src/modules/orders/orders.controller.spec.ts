<<<<<<< HEAD
import { jest } from '@jest/globals';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
<<<<<<< HEAD
  const ordersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
<<<<<<< HEAD
      providers: [{ provide: OrdersService, useValue: ordersService }],
=======
      providers: [OrdersService],
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
