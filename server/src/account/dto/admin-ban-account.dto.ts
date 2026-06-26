import { IsOptional, IsString, MaxLength, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminBanAccountDto {
  @ApiProperty({ description: 'Reason for the ban', maxLength: 500 })
  @IsNotEmpty({ message: 'admin.account.validation.ban_reason_required' })
  @IsString()
  @MaxLength(500, { message: 'admin.account.validation.ban_reason_too_long' })
  reason: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO format). Null means permanent.' })
  @IsOptional()
  @IsDateString({}, { message: 'admin.account.validation.ban_expiration_invalid' })
  banExpiresAt?: string | null;
}
