import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Menu } from '../menu/entities/menu.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Order, OrderItem, Menu])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
