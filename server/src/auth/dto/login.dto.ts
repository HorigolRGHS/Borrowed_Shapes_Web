import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user.dto';

export class LoginRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email: string | undefined;

  @ApiProperty({ example: 'P@ssw0rd123!' })
  @IsString()
  password: string | undefined;

  @ApiProperty({ example: 'game', enum: ['game', 'web'] })
  @IsIn(['game', 'web'])
  platform: 'game' | 'web' | undefined;

  @ApiPropertyOptional({ example: 'Windows 11 / Chrome 124' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ example: 'user-id:game:session-id' })
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ example: '2026-05-05T13:24:11.000Z' })
  expiresAt!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
