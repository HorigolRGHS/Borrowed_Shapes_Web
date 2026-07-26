import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsIn,
  IsUUID,
  IsOptional,
} from 'class-validator';

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class ThreadImageUploadRequestDto {
  @ApiProperty({ example: 'thread-banner.png' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 102400 })
  @IsNumber()
  @Min(1)
  fileSize!: number;

  @ApiProperty({
    example: 'image/png',
    enum: ALLOWED_IMAGE_MIME_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_IMAGE_MIME_TYPES)
  mimeType!: string;

  @ApiPropertyOptional({ example: '3bcdd74c-a56f-4e1a-ad62-581be8d9cdca' })
  @IsOptional()
  @IsUUID('4')
  threadId?: string;
}

export class ThreadImageUploadResponseDto {
  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  publicUrl!: string;

  @ApiProperty()
  headers!: Record<string, string>;
}
