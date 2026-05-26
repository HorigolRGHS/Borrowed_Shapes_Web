import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuthUserResponseDto } from './auth-user.dto';
import { LoginResponseDto } from './login.dto';

export class GoogleExchangeRequestDto {
  @ApiProperty({
    description: 'Authorization code returned by Google (OAuth2 authorization code flow)',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'PKCE code_verifier used to generate code_challenge',
  })
  @IsString()
  codeVerifier!: string;

  @ApiProperty({
    description: 'Must match the redirect URI used in the authorize step',
    example: 'http://localhost:3000/auth/google/callback',
  })
  @IsString()
  redirectUri!: string;

  @ApiProperty({ example: 'game', enum: ['game', 'web'] })
  @IsIn(['game', 'web'])
  platform!: 'game' | 'web';

  @ApiPropertyOptional({ example: 'Unity 6 / Windows 11' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class GoogleExchangeResponseDto {
  @ApiProperty({
    description: 'One-time login code to be exchanged for tokens from the game client',
    example: 'h1p4z6q3f0k1j2l3m4n5o6p7',
  })
  loginCode!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;
}

export class GoogleCompleteRequestDto {
  @ApiProperty({ description: 'One-time login code returned by /auth/google/exchange' })
  @IsString()
  loginCode!: string;

  @ApiProperty({ example: 'game', enum: ['game', 'web'] })
  @IsIn(['game', 'web'])
  platform!: 'game' | 'web';

  @ApiPropertyOptional({ example: 'Unity 6 / Windows 11' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class GoogleCompleteResponseDto extends LoginResponseDto {}
