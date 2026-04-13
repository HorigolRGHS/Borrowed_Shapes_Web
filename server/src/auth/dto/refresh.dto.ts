import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshRequestDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
