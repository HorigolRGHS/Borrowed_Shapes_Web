import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WIKI_SEARCH_MAX_LENGTH,
  WIKI_LIST_DEFAULT_LIMIT,
  WIKI_LIST_MAX_LIMIT,
} from './wiki-constants';

export class WikiSearchQueryDto {
  @ApiProperty({ maxLength: WIKI_SEARCH_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(WIKI_SEARCH_MAX_LENGTH)
  q!: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: WIKI_LIST_MAX_LIMIT,
    default: WIKI_LIST_DEFAULT_LIMIT,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(WIKI_LIST_MAX_LIMIT)
  limit?: number = WIKI_LIST_DEFAULT_LIMIT;
}
