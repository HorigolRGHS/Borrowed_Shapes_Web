import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUpdateAccountProfileDto {
  @ApiPropertyOptional({
    description: 'Display name',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'profile.edit.validation.display_name_too_short' })
  @MaxLength(50, { message: 'profile.edit.validation.display_name_too_long' })
  @Matches(/^[\p{L}0-9 _-]+$/u, { message: 'profile.edit.validation.display_name_invalid' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  imgUrl?: string | null;
}
