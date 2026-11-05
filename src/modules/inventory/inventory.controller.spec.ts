import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: inventoryService }],
<<<<<<< HEAD
=======
      providers: [InventoryService],
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
