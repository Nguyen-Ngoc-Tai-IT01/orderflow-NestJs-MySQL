<<<<<<< HEAD
import { jest } from '@jest/globals';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
<<<<<<< HEAD
  const inventoryService = {
    create: jest.fn(),
    createTransaction: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findRecipes: jest.fn(),
    findTransactions: jest.fn(),
    remove: jest.fn(),
    setRecipe: jest.fn(),
    update: jest.fn(),
  };
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
<<<<<<< HEAD
      providers: [{ provide: InventoryService, useValue: inventoryService }],
=======
      providers: [InventoryService],
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
