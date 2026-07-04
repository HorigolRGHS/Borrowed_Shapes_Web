import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsIn } from 'class-validator';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class AchievementUploadUrlDto {
  @ApiProperty({ description: 'Original file name', example: 'badge.png' })
  @IsNotEmpty({ message: 'achievements.file_name_required' })
  @IsString({ message: 'achievements.file_name_must_be_string' })
  fileName!: string;

  @ApiProperty({ description: 'Achievement ID for folder structure', example: 'ach-123' })
  @IsNotEmpty({ message: 'achievements.id_required' })
  @IsString({ message: 'achievements.id_must_be_string' })
  achievementId!: string;

  @ApiProperty({ description: 'File size in bytes', example: 102400 })
  @IsNotEmpty()
  @IsNumber({}, { message: 'achievements.file_size_must_be_number' })
  @Min(1, { message: 'achievements.file_size_invalid' })
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/png',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsNotEmpty({ message: 'achievements.mime_type_required' })
  @IsIn(ALLOWED_MIME_TYPES, { message: 'achievements.mime_type_invalid' })
  mimeType!: string;
}
