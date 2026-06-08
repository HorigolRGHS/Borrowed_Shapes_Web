import { IsString, IsOptional, IsUrl, IsBoolean, IsInt, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  @Length(3, 100)
  name_vi!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  slug?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  slug_vi?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description_vi?: string;

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
