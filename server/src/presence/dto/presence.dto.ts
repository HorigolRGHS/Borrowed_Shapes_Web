import { ApiProperty } from '@nestjs/swagger';

export class PresenceResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: 'user@example.com', required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ example: 'John Doe', required: false, nullable: true })
  displayName?: string | null;

  @ApiProperty({ example: 'USER', required: false, nullable: true })
  role?: string | null;

  @ApiProperty({ example: true })
  isOnline: boolean;

  @ApiProperty({ example: '2024-03-20T10:00:00Z', required: false, nullable: true, type: Date })
  lastOnline: Date | null;

  @ApiProperty({ example: ['web', 'game'], type: [String] })
  onlinePlatforms: string[];
}
