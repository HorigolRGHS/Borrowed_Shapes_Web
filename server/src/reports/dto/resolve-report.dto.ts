import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ReportAction } from '../../entities/ReportAction';

export class ResolveReportDto {
  @IsEnum(ReportAction)
  actionTaken!: ReportAction;

  @IsString()
  message!: string;

  @IsOptional()
  @IsDateString()
  banExpiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToReporter?: boolean;
}
