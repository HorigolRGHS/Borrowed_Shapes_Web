import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: 'This is an updated comment.' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
