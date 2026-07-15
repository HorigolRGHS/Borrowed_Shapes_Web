import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardRange {
  DAYS_7 = '7d',
  DAYS_30 = '30d',
  DAYS_90 = '90d',
}

export class AdminDashboardStatisticsQueryDto {
  @ApiPropertyOptional({
    enum: DashboardRange,
    default: DashboardRange.DAYS_30,
  })
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange = DashboardRange.DAYS_30;
}
