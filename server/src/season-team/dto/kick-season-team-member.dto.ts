import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KickSeasonTeamMemberDto {
  @ApiProperty({
    description: 'GameProfileId của thành viên cần kick',
    example: 'BS00001234',
  })
  @IsString({ message: 'validation.invalid_string' })
  @IsNotEmpty({ message: 'validation.required' })
  gameProfileId!: string;
}
