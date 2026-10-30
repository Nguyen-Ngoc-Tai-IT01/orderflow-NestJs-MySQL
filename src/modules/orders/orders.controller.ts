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
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  // Các endpoint của controller
}
