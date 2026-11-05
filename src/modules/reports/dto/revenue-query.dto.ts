import { IsIn, IsOptional } from 'class-validator';
import { ReportQueryDto } from './report-query.dto';

export class RevenueQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsIn(['day', 'week'])
  period: 'day' | 'week' = 'day';
}
