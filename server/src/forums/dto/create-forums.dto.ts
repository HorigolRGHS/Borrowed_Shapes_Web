import {
  IsString,
  IsOptional,
  Length,
  IsUUID,
  IsUrl,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ForumPostType } from '../../entities/ForumPostType';
import { ForumThreadStatus } from '../../entities/ForumThreadStatus';

export class CreateForumDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  slug?: string;

  @IsString()
  @Length(1, 20000)
  content!: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(ForumPostType)
  postType?: ForumPostType;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsEnum(ForumThreadStatus)
  status?: ForumThreadStatus;
}