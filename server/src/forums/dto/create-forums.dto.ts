import { IsString, IsOptional, Length, IsUUID, IsUrl, IsNotEmpty } from 'class-validator';

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
}