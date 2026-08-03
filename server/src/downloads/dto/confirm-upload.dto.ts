import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class ConfirmUploadDto {
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

  @ApiProperty({
    description: 'R2 object key returned from upload-url step',
    example: 'game/windows/1.4.2/BorrowedShapes-1.4.2.exe',
  })
  @IsNotEmpty({ message: 'downloads.file_path_required' })
  @IsString()
  filePath!: string;

  @ApiProperty({ description: 'File size in bytes', example: 123456789 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'downloads.file_size_invalid' })
  fileSize!: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/octet-stream',
  })
  @IsNotEmpty({ message: 'downloads.mime_type_required' })
  @IsString()
  mimeType!: string;
}
