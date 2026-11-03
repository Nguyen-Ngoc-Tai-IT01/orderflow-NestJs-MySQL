import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../menu/entities/menu.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Inventory } from './entities/inventory.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
<<<<<<< HEAD
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryTransaction,
      MenuItemIngredient,
      Menu,
    ]),
  ],
=======
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
