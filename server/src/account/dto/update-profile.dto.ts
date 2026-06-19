import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'profile.edit.validation.display_name_too_short' })
  @MaxLength(50, { message: 'profile.edit.validation.display_name_too_long' })
  @Matches(/\S/, { message: 'profile.edit.validation.display_name_required' })
  displayName?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  imgUrl?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  equippedAchievementId?: string | null;
}
