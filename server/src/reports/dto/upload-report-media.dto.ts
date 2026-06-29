import { IsString, IsNumber, IsIn } from 'class-validator';

export class UploadReportMediaDto {
  @IsString()
  fileName!: string;

  @IsNumber()
  fileSize!: number;

  @IsString()
  mimeType!: string;

  @IsString()
  @IsIn(['user', 'thread', 'comment'])
  targetType!: 'user' | 'thread' | 'comment';

  @IsString()
  targetId!: string;
}
