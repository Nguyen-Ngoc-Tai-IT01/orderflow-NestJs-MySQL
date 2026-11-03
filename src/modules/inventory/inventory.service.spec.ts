<<<<<<< HEAD
import { jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import {
  InventoryTxType,
  InventoryTransaction,
} from './entities/inventory-transaction.entity';
import { Inventory } from './entities/inventory.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  it('updates stock using three-decimal arithmetic and records the import', async () => {
    const inventory = {
      id: 'inventory-1',
      quantity: 0.2,
    } as Inventory;
    const manager = {
      findOne: jest.fn(() => inventory),
      create: jest.fn((_entity: unknown, values: Record<string, unknown>) => ({
        ...values,
      })),
      save: jest.fn((value: unknown) => value),
    };
    const dataSource = {
      transaction: (callback: (manager: unknown) => Promise<unknown>) =>
        callback(manager),
    } as unknown as DataSource;
    const service = new InventoryService(
      {} as Repository<Inventory>,
      {} as Repository<InventoryTransaction>,
      {} as Repository<MenuItemIngredient>,
      dataSource,
    );

    const transaction = await service.createTransaction('inventory-1', {
      type: InventoryTxType.IMPORT,
      quantity: 0.1,
    });

    expect(inventory.quantity).toBe(0.3);
    expect(transaction).toMatchObject({
      type: InventoryTxType.IMPORT,
      quantity: 0.1,
    });
    expect(manager.save.mock.calls).toHaveLength(2);
  });

  it('rejects exports that would make stock negative', async () => {
    const inventory = {
      id: 'inventory-1',
      name: 'Noodles',
      unit: 'kg',
      quantity: 0.2,
    } as Inventory;
    const manager = {
      findOne: jest.fn(() => inventory),
      save: jest.fn((value: unknown) => value),
    };
    const service = new InventoryService(
      {} as Repository<Inventory>,
      {} as Repository<InventoryTransaction>,
      {} as Repository<MenuItemIngredient>,
      {
        transaction: (callback: (manager: unknown) => Promise<unknown>) =>
          callback(manager),
      } as unknown as DataSource,
    );

    await expect(
      service.createTransaction('inventory-1', {
        type: InventoryTxType.EXPORT,
        quantity: 0.201,
      }),
    ).rejects.toThrow('Không đủ');
    expect(manager.save.mock.calls).toHaveLength(0);
=======
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
  });
});
