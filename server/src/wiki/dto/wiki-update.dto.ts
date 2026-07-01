import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { WikiCreateRequestDto } from './wiki-create.dto';

export class WikiUpdateRequestDto extends WikiCreateRequestDto {
  @ApiProperty({
    description:
      'Latest revision id observed by the client when the form was opened',
  })
  @IsString()
  @IsNotEmpty()
  expectedLatestRevisionId!: string;

  @ApiPropertyOptional({
    description: 'Bypass concurrency check; flagged in audit log',
  })
  @IsOptional()
  @IsBoolean()
  forceOverwrite?: boolean;
}
