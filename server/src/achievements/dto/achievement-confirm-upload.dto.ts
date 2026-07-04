import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
export class AchievementConfirmUploadDto {
  @ApiProperty({ description: 'Achievement ID', example: 'ach-123' })
  @IsNotEmpty({ message: 'achievements.id_required' })
  @IsString({ message: 'achievements.id_must_be_string' })
  achievementId!: string;
  @ApiProperty({
    description: 'R2 object key returned from upload-url step',
    example: 'achievement/ach-123/uuid.png',
  })
  @IsNotEmpty({ message: 'achievements.file_path_required' })
  @IsString({ message: 'achievements.file_path_must_be_string' })
  filePath!: string;
  @ApiProperty({ description: 'MIME type of the file', example: 'image/png' })
  @IsNotEmpty({ message: 'achievements.mime_type_required' })
  @IsString({ message: 'achievements.mime_type_must_be_string' })
  mimeType!: string;
  @ApiProperty({ description: 'File size in bytes', example: 102400 })
  @IsNotEmpty()
  @IsNumber({}, { message: 'achievements.file_size_must_be_number' })
  @Min(1, { message: 'achievements.file_size_invalid' })
  fileSize!: number;
  @ApiPropertyOptional({ description: 'Old badge image URL to delete', example: 'https://pub-x.r2.dev/achievement/ach-123/old-uuid.png' })
  @IsOptional()
  @IsString({ message: 'achievements.old_url_must_be_string' })
  oldBadgeImageUrl?: string;
}
