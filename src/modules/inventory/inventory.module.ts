import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../menu/entities/menu.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Inventory } from './entities/inventory.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryTransaction,
      MenuItemIngredient,
      Menu,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
