import { ApiProperty } from '@nestjs/swagger';
import { AchievementResponseDto } from './achievement-response.dto';

export class UserAchievementResponseDto {
  @ApiProperty({ type: AchievementResponseDto })
  achievement!: AchievementResponseDto;

  @ApiProperty({ example: '2026-05-13T10:00:00.000Z' })
  achievedAt!: Date;
}