<<<<<<< HEAD
import {
  Controller,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Get,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Post,
  Body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Patch,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Param,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Delete,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CreateOrderDto } from './dto/create-order.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
=======
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
<<<<<<< HEAD
  // Các endpoint của controller
=======

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
>>>>>>> f8f341eca9b95b1839b377352647cc4a585188bd
}
