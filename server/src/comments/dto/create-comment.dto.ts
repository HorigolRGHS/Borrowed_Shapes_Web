import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '3bcdd74c-a56f-4e1a-ad62-581be8d9cdca' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  threadId!: string;

  @ApiProperty({ example: 'This is a comment.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ example: '3bcdd74c-a56f-4e1a-ad62-581be8d9cdca' })
  @IsOptional()
  @IsString()
  @IsUUID()
  parentId?: string;
}
