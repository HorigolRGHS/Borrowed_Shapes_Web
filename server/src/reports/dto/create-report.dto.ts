import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType } from '../../entities/ReportType';
import { MediaType } from '../../entities/MediaType';

export class ReportMediaDto {
  @IsString()
  mediaUrl!: string;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsOptional()
  fileSize?: number;
}

export class CreateReportDto {
  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;

  @IsEnum(ReportType)
  reportType!: ReportType;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportMediaDto)
  media?: ReportMediaDto[];
}
