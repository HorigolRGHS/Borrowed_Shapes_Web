import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UnlockAchievementDto {
  @ApiProperty({ example: 'FIRST_BLOOD', description: 'The criteria code of the achievement' })
  @IsString()
  @IsNotEmpty()
  criteriaCode: string;
}

export class UnlockAchievementResponseDto {
  @ApiProperty({ example: true, description: 'True if newly unlocked, false if already unlocked' })
  unlocked: boolean;

  @ApiProperty({
    example: { id: '35973179-5262-4e93-9a17-2e5a9b04f69c', name: 'First Blood', badgeImageUrl: 'http://...' },
    description: 'The achievement details'
  })
  achievement: {
    id: string;
    name: string;
    badgeImageUrl: string;
  };
}
