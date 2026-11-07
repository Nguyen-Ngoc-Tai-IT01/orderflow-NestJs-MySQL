import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Menu } from '../menu/entities/menu.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import {
  InventoryTxType,
  InventoryTransaction,
} from './entities/inventory-transaction.entity';
import { Inventory } from './entities/inventory.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
import { SetMenuIngredientDto } from './dto/set-menu-ingredient.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(MenuItemIngredient)
    private readonly recipeRepository: Repository<MenuItemIngredient>,
    private readonly dataSource: DataSource,
  ) {}

  create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = manager.create(Inventory, {
        ...createInventoryDto,
        quantity: createInventoryDto.quantity ?? 0,
        minQuantity: createInventoryDto.minQuantity ?? 0,
      });
      const savedInventory = await manager.save(inventory);

      if (savedInventory.quantity > 0) {
        await manager.save(
          manager.create(InventoryTransaction, {
            inventory: savedInventory,
            type: InventoryTxType.IMPORT,
            quantity: savedInventory.quantity,
            note: 'Tồn kho ban đầu',
          }),
        );
      }

      return savedInventory;
    });
  }

  findAll(): Promise<Inventory[]> {
    return this.inventoryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({ where: { id } });
    if (!inventory) {
      throw new NotFoundException('Không tìm thấy nguyên liệu');
    }
    return inventory;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.findOne(id);
    Object.assign(inventory, updateInventoryDto);
    return this.inventoryRepository.save(inventory);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, { where: { id } });
      if (!inventory) {
        throw new NotFoundException('Không tìm thấy nguyên liệu');
      }

      const [transactionCount, recipeCount] = await Promise.all([
        manager.count(InventoryTransaction, { where: { inventory: { id } } }),
        manager.count(MenuItemIngredient, { where: { inventoryId: id } }),
      ]);
      if (transactionCount > 0 || recipeCount > 0) {
        throw new ConflictException(
          'Không thể xóa nguyên liệu đã có lịch sử giao dịch hoặc đang được sử dụng trong công thức',
        );
      }

      await manager.remove(inventory);
    });
  }

  async findTransactions(id: string): Promise<InventoryTransaction[]> {
    await this.findOne(id);
    return this.transactionRepository.find({
      where: { inventory: { id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findRecipes(id: string): Promise<MenuItemIngredient[]> {
    await this.findOne(id);
    return this.recipeRepository.find({
      where: { inventoryId: id },
      order: { menuItemId: 'ASC' },
    });
  }

  setRecipe(
    inventoryId: string,
    menuItemId: string,
    dto: SetMenuIngredientDto,
  ): Promise<MenuItemIngredient> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { id: inventoryId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) {
        throw new NotFoundException('Không tìm thấy nguyên liệu');
      }

      const menuItem = await manager.findOne(Menu, {
        where: { id: menuItemId },
      });
      if (!menuItem) {
        throw new NotFoundException('Không tìm thấy món');
      }

      const recipe = await manager.findOne(MenuItemIngredient, {
        where: { inventoryId, menuItemId },
      });
      if (recipe) {
        recipe.quantityPerUnit = dto.quantityPerUnit;
        return manager.save(recipe);
      }

      return manager.save(
        manager.create(MenuItemIngredient, {
          inventory,
          inventoryId,
          menuItemId,
          quantityPerUnit: dto.quantityPerUnit,
        }),
      );
    });
  }

  createTransaction(
    id: string,
    dto: CreateInventoryTransactionDto,
  ): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const inventory = await manager.findOne(Inventory, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventory) {
        throw new NotFoundException('Không tìm thấy nguyên liệu');
      }

      if (dto.type === InventoryTxType.IMPORT) {
        inventory.quantity =
          (Math.round(inventory.quantity * 1000) +
            Math.round(dto.quantity * 1000)) /
          1000;
      } else {
        const currentMilliUnits = Math.round(inventory.quantity * 1000);
        const requestedMilliUnits = Math.round(dto.quantity * 1000);
        if (currentMilliUnits < requestedMilliUnits) {
          throw new BadRequestException(
            `Không đủ "${inventory.name}": yêu cầu ${dto.quantity}${inventory.unit}, còn ${inventory.quantity}${inventory.unit}`,
          );
        }
        inventory.quantity = (currentMilliUnits - requestedMilliUnits) / 1000;
      }

      await manager.save(inventory);
      return manager.save(
        manager.create(InventoryTransaction, {
          inventory,
          type: dto.type,
          quantity: dto.quantity,
          note: dto.note,
        }),
      );
    });
  }
}
