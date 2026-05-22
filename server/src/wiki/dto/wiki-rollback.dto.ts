import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WikiRollbackRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetRevisionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expectedLatestRevisionId!: string;
}
