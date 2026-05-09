import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailRequestDto {
  @ApiProperty({ example: 'verification-token-abc123' })
  @IsString()
  @IsNotEmpty({ message: 'validation.token_required' })
  token!: string;
}
export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  email!: string;
}
export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail({}, { message: 'validation.invalid_email' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'validation.otp_required' })
  otp!: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8, { message: 'validation.password_min_8' })
  @MaxLength(72, { message: 'validation.password_max_length' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message: 'validation.password_complex',
  })
  newPassword!: string;
}
export class ChangePasswordRequestDto {
  @ApiProperty({ example: 'OldP@ssw0rd!' })
  @IsString()
  @IsNotEmpty({ message: 'validation.password_required' })
  oldPassword!: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8, { message: 'validation.password_min_8' })
  @MaxLength(72, { message: 'validation.password_max_length' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message: 'validation.password_complex',
  })
  newPassword!: string;
}

