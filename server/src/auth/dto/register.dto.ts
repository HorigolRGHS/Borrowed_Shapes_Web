import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @IsEmail()
  email: string | undefined;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string | undefined;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Display name may only contain letters, numbers, underscores, and hyphens',
  })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}

export class RegisterResponseDto {
  userId!: string;
  email!: string;
  displayName!: string | null;
  role!: string;
}

export class RegisterDto {
  @IsEmail()
  email: string | undefined;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  // Must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string | undefined;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Display name may only contain letters, numbers, underscores, and hyphens' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}
