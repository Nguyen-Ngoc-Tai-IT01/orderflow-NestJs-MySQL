import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportQueryDto } from './dto/report-query.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { TopItemsQueryDto } from './dto/top-items-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  getRevenue(@Query() query: RevenueQueryDto) {
    return this.reportsService.getRevenue(query);
  }

  @Get('cancelled-orders')
  getCancelledOrders(@Query() query: ReportQueryDto) {
    return this.reportsService.getCancelledOrders(query);
  }

  @Get('top-items')
  getTopItems(@Query() query: TopItemsQueryDto) {
    return this.reportsService.getTopItems(query);
  }
}
