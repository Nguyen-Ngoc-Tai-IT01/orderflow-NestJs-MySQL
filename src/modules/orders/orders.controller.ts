import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto'; // DTO chứa phân trang, filter

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // API Tạo đơn hàng mới
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  // API Lấy danh sách đơn hàng (hỗ trợ phân trang, search, filter)
  @Get()
  findAll(@Query() queryDto: QueryOrderDto) {
    return this.ordersService.findAll(queryDto);
  }

  // API Lấy chi tiết 1 đơn hàng
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // API Cập nhật trạng thái đơn hàng (State Machine)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }
}
