import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

export class AvatarUploadRequestDto {
  @ApiProperty({ example: 'avatar.png' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 102400 })
  @IsNumber()
  @Min(1, { message: 'profile.edit.validation.avatar_too_small' })
  fileSize: number;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType: string;
}

export class AvatarUploadResponseDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  headers: Record<string, string>;
}
