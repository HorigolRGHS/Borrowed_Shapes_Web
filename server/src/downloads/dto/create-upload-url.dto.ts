import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min, IsIn } from 'class-validator';

const ALLOWED_MIME_TYPES = [
  'application/octet-stream',
  'application/x-msdownload',
  'application/zip',
];

export class CreateUploadUrlDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'BorrowedShapes-1.4.2.exe',
  })
  @IsNotEmpty({ message: 'downloads.file_name_required' })
  @IsString()
  fileName!: string;

  @ApiProperty({ description: 'Semantic version string', example: '1.4.2' })
  @IsNotEmpty({ message: 'downloads.file_version_required' })
  @IsString()
  fileVersion!: string;

  @ApiProperty({ description: 'File size in bytes', example: 123456789 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'downloads.file_size_invalid' })
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/octet-stream',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsNotEmpty({ message: 'downloads.mime_type_required' })
  @IsIn(ALLOWED_MIME_TYPES, { message: 'downloads.mime_type_invalid' })
  mimeType!: string;
}
