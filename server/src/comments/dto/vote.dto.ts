import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class CommentVoteDto {
  @ApiProperty({ example: 1, enum: [1, -1] })
  @IsIn([1, -1])
  value!: 1 | -1;
}
