import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthUserResponseDto } from './auth-user.dto';

export class LoginRequestDto {
  @IsEmail()
  email: string | undefined;

  @IsString()
  password: string | undefined;

  @IsIn(['game', 'forum'])
  platform: 'game' | 'forum' | undefined;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
  expiresAt!: string;
  user!: AuthUserResponseDto;
}
