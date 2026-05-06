import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email: string | undefined;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string | undefined;

  @ApiPropertyOptional({ example: 'BorrowedPlayer' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9 _-]+$/, {
    message: 'Display name may only contain letters, numbers, spaces, underscores, and hyphens',
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
  @IsEmail()
  email: string | undefined;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  // Must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string | undefined;

  @ApiPropertyOptional({ example: 'BorrowedPlayer' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9 _-]+$/, { message: 'Display name may only contain letters, numbers, spaces, underscores, and hyphens' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Windows 11 / Chrome 124' })
  @MaxLength(500)
  deviceInfo?: string;
}
