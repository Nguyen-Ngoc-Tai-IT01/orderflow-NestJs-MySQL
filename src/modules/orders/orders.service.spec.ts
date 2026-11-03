import { Test, TestingModule } from '@nestjs/testing';
<<<<<<< HEAD
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
<<<<<<< HEAD
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
=======
      providers: [OrdersService],
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
