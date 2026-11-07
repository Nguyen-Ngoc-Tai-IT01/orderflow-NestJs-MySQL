import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  RestaurantTable,
  TableStatus,
} from './entities/restaurant-table.entity';
import { TablesService } from './tables.service';

describe('TablesService', () => {
  let service: TablesService;
  let repository: jest.Mocked<
    Pick<
      Repository<RestaurantTable>,
      'create' | 'save' | 'find' | 'findOneBy' | 'remove'
    >
  >;

  beforeEach(async () => {
    repository = {
      create: jest.fn((table) => table as RestaurantTable),
      save: jest.fn((table) => Promise.resolve(table as RestaurantTable)),
      find: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        {
          provide: getRepositoryToken(RestaurantTable),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
  });

  it('creates tables in the available state by default', async () => {
    const table = { tableNumber: 'A1', capacity: 4 };
    await service.create(table);

    expect(repository.create).toHaveBeenCalledWith(table);
    expect(repository.save).toHaveBeenCalled();
  });

  it('reserves an available table with the supplied customer details', async () => {
    const table = {
      id: 'table-id',
      capacity: 4,
      status: TableStatus.AVAILABLE,
    } as RestaurantTable;
    repository.findOneBy.mockResolvedValue(table);
    const reservation: CreateReservationDto = {
      customerName: 'An',
      customerPhone: '0900000000',
      reservationAt: '2026-11-05T19:00:00.000Z',
      partySize: 3,
    };

    await service.reserve(table.id, reservation);

    expect(table.status).toBe(TableStatus.RESERVED);
    expect(table.customerName).toBe(reservation.customerName);
    expect(table.reservationAt).toEqual(new Date(reservation.reservationAt));
  });

  it('rejects reservations that exceed table capacity', async () => {
    repository.findOneBy.mockResolvedValue({
      id: 'table-id',
      capacity: 2,
      status: TableStatus.AVAILABLE,
    } as RestaurantTable);

    await expect(
      service.reserve('table-id', {
        customerName: 'An',
        reservationAt: '2026-11-05T19:00:00.000Z',
        partySize: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports a missing table', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
