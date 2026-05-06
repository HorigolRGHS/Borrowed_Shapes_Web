import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailRequestDto {
  @ApiProperty({ example: 'verification-token-abc123' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  token!: string;
}
export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email!: string;
}
export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'player@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  otp!: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;
}
export class ChangePasswordRequestDto {
  @ApiProperty({ example: 'OldP@ssw0rd!' })
  @IsString()
  @MinLength(1)
  oldPassword!: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;
}

