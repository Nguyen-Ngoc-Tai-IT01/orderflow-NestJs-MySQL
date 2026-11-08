import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders
  // Tạo đơn hàng mới
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  // GET /orders
  // Lấy danh sách, tìm kiếm, lọc và phân trang
  @Get()
  findAll(@Query() queryDto: QueryOrderDto) {
    return this.ordersService.findAll(queryDto);
  }

  // GET /orders/:id
  // Lấy chi tiết đơn hàng
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.ordersService.findOne(id);
  }

  // PATCH /orders/:id/status
  // Cập nhật trạng thái đơn hàng
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,

    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto.status);
  }
}
