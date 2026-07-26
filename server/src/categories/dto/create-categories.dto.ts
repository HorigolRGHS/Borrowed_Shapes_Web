import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsInt,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'General', minLength: 3, maxLength: 100 })
  @IsString()
  @Length(3, 100)
  name!: string;

  @ApiProperty({ example: 'Chung', minLength: 3, maxLength: 100 })
  @IsString()
  @Length(3, 100)
  nameVi!: string;

  @ApiPropertyOptional({ example: 'general', minLength: 0, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  slug?: string;

  @ApiPropertyOptional({ example: 'chung', minLength: 0, maxLength: 200 })
  @IsString()
  @Length(0, 200)
  slugVi?: string;

  @ApiPropertyOptional({
    example: 'This is a general category for discussions.',
    minLength: 0,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    example: 'Đây là chuyên mục chung cho các cuộc thảo luận.',
    minLength: 0,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  descriptionVi?: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.png' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @ApiPropertyOptional({ example: '3bcdd74c-a56f-4e1a-ad62-581be8d9cdca' })
  @IsOptional()
  @IsString()
  id?: string;
}
