import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  email: string | undefined;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  @MinLength(8, { message: 'validation.password_min_8' })
  @MaxLength(72, { message: 'validation.password_max_length' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/,
    {
      message: 'validation.password_complex',
    },
  )
  password: string | undefined;

  @ApiPropertyOptional({ example: 'BorrowedPlayer' })
  @IsNotEmpty({ message: 'validation.display_name_required' })
  @IsString()
  @MinLength(3, { message: 'validation.display_name_min_3' })
  @MaxLength(20, { message: 'validation.display_name_max_20' })
  @Matches(/^[a-zA-Z0-9 _-]+$/, {
    message: 'validation.display_name_invalid',
  })
  displayName: string | undefined;

  @ApiPropertyOptional({ example: 'Windows 11 / Chrome 124' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'user_123' })
  userId!: string;

  @ApiProperty({ example: 'BS00000001' })
  gameProfileId!: string;

  @ApiProperty({ example: 'player@example.com' })
  email!: string;

  @ApiProperty({ example: 'BorrowedPlayer', nullable: true })
  displayName!: string | null;

  @ApiProperty({ example: 'USER' })
  role!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  email: string | undefined;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  @MinLength(8, { message: 'validation.password_min_8' })
  @MaxLength(72, { message: 'validation.password_max_length' })
  // Must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/,
    {
      message: 'validation.password_complex',
    },
  )
  password: string | undefined;

  @ApiPropertyOptional({ example: 'BorrowedPlayer' })
  @IsOptional()
  @IsNotEmpty({ message: 'validation.display_name_required' })
  @IsString()
  @MinLength(3, { message: 'validation.display_name_min_3' })
  @MaxLength(20, { message: 'validation.display_name_max_20' })
  @Matches(/^[a-zA-Z0-9 _-]+$/, { message: 'validation.display_name_invalid' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Windows 11 / Chrome 124' })
  @MaxLength(500)
  deviceInfo?: string;
}
