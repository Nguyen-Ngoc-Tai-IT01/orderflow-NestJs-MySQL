import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Menu } from '../menu/entities/menu.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { ReportQueryDto } from './dto/report-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { TopItemsQueryDto } from './dto/top-items-query.dto';

interface RevenueRow {
  period: string | Date;
  revenue: string | number;
  orderCount: string | number;
}

interface TopItemRow {
  menuItemId: string;
  name: string;
  quantity: string | number;
  revenue: string | number;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async getRevenue(query: RevenueQueryDto) {
    this.validateRange(query);
    const periodExpression =
      query.period === 'week'
        ? "DATE_FORMAT(order.createdAt, '%x-W%v')"
        : 'DATE(order.createdAt)';
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .select(periodExpression, 'period')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .addSelect('COUNT(order.id)', 'orderCount')
      .where('order.status = :status', { status: OrderStatus.SERVED });

    this.applyRange(queryBuilder, query);
    const rows = await queryBuilder
      .groupBy(periodExpression)
      .orderBy(periodExpression, 'ASC')
      .getRawMany<RevenueRow>();

    return rows.map((row) => ({
      period:
        row.period instanceof Date
          ? row.period.toISOString().slice(0, 10)
          : row.period,
      revenue: Number(row.revenue),
      orderCount: Number(row.orderCount),
    }));
  }

  async getCancelledOrders(query: ReportQueryDto) {
    this.validateRange(query);
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.CANCELLED });
    this.applyRange(queryBuilder, query);

    return { total: await queryBuilder.getCount() };
  }

  async getTopItems(query: TopItemsQueryDto) {
    this.validateRange(query);
    const queryBuilder = this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .leftJoin(Menu, 'menu', 'menu.id = item.menuItemId')
      .select('item.menuItemId', 'menuItemId')
      .addSelect('COALESCE(menu.name, item.name)', 'name')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.unitPrice * item.quantity)', 'revenue')
      .where('order.status = :status', { status: OrderStatus.SERVED });

    this.applyRange(queryBuilder, query, 'order');
    const rows = await queryBuilder
      .groupBy('item.menuItemId')
      .addGroupBy('menu.name')
      .addGroupBy('item.name')
      .orderBy('SUM(item.quantity)', 'DESC')
      .addOrderBy('name', 'ASC')
      .take(query.limit)
      .getRawMany<TopItemRow>();

    return rows.map((row) => ({
      menuItemId: row.menuItemId,
      name: row.name,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    }));
  }

  private validateRange(query: ReportQueryDto): void {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
      );
    }
  }

  private applyRange<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    query: ReportQueryDto,
    alias = 'order',
  ): void {
    if (query.from) {
      queryBuilder.andWhere(`${alias}.createdAt >= :from`, {
        from: `${query.from} 00:00:00`,
      });
    }
    if (query.to) {
      const exclusiveEnd = new Date(`${query.to}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      queryBuilder.andWhere(`${alias}.createdAt < :to`, {
        to: exclusiveEnd.toISOString().slice(0, 19).replace('T', ' '),
      });
    }
  }
}
