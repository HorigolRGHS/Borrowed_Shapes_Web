import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class RejectReportDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToReporter?: boolean;
}
