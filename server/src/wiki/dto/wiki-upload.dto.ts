import { ApiProperty } from '@nestjs/swagger';

export class WikiUploadResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;
}
