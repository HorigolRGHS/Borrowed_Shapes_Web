import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class GameVersionQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by file name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['uploadedAt', 'fileVersion', 'fileSize', 'downloadCount'],
    default: 'uploadedAt',
  })
  @IsOptional()
  @IsIn(['uploadedAt', 'fileVersion', 'fileSize', 'downloadCount'])
  sortBy?: 'uploadedAt' | 'fileVersion' | 'fileSize' | 'downloadCount' = 'uploadedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter by exact version string' })
  @IsOptional()
  @IsString()
  version?: string;
}
