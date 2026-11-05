import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { SetMenuIngredientDto } from './dto/set-menu-ingredient.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id/transactions')
  findTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findTransactions(id);
  }

  @Post(':id/transactions')
  createTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInventoryTransactionDto,
  ) {
    return this.inventoryService.createTransaction(id, dto);
  }

  @Get(':id/recipes')
  findRecipes(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findRecipes(id);
  }

  @Put(':id/recipes/:menuItemId')
  setRecipe(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Body() dto: SetMenuIngredientDto,
  ) {
    return this.inventoryService.setRecipe(id, menuItemId, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.remove(id);
<<<<<<< HEAD
=======
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.update(+id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(+id);
>>>>>>> 53dcff77b7db803d484f5c9ea613d3194be196d6
  }
}
