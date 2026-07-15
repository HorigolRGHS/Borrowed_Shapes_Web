import { ApiProperty } from '@nestjs/swagger';

export class SeasonTeamMemberResponseDto {
  @ApiProperty({ example: 'BS00001234' })
  gameProfileId!: string;

  @ApiProperty({ example: 'PlayerOne', required: false, nullable: true })
  displayName?: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/avatar.png',
    required: false,
    nullable: true,
  })
  imgUrl?: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/badge.png',
    required: false,
    nullable: true,
  })
  badgeImageUrl?: string | null;

  @ApiProperty({ example: '2026-05-17T08:41:32.000Z' })
  joinedAt!: Date;

  @ApiProperty({ example: false })
  isLeader!: boolean;
}

export class SeasonTeamResponseDto {
  @ApiProperty({ example: 'b7ab6fd5-f9f4-489a-a300-f67bb60fba03' })
  id!: string;

  @ApiProperty({ example: '2026-05-01' })
  seasonMonth!: string;

  @ApiProperty({ example: 'AB12CD', nullable: true })
  code!: string | null;

  @ApiProperty({ example: 'SpeedRunners', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'BS00001234' })
  leaderGameProfileId!: string;

  @ApiProperty({ example: 5 })
  maxMembers!: number;

  @ApiProperty({ example: 3 })
  currentMembers!: number;

  @ApiProperty({ type: [SeasonTeamMemberResponseDto] })
  members!: SeasonTeamMemberResponseDto[];
}
