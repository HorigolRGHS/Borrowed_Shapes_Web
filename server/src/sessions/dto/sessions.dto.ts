import { ApiProperty } from '@nestjs/swagger';

export class UserSessionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: 'abc-def-ghi' })
  sessionId: string;

  @ApiProperty({ example: 'web' })
  platform: string;

  @ApiProperty({ type: Date })
  loginTime: Date;

  @ApiProperty({ required: false, nullable: true, type: Date })
  logoutTime: Date | null;

  @ApiProperty({ required: false, nullable: true })
  deviceInfo: string | null;

  @ApiProperty({ required: false, nullable: true })
  ipAddress: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isCurrent: boolean;

  @ApiProperty({ required: false, nullable: true })
  lastActive: string | null;
}

export class SessionMeResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: 'web' })
  platform: string;

  @ApiProperty({ required: false })
  sessionId?: string;

  @ApiProperty({ required: false })
  lastActive?: string;
}
