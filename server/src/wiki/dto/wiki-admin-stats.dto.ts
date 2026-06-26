import { ApiProperty } from '@nestjs/swagger';

export class WikiAdminStatsDto {
  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  published!: number;

  @ApiProperty()
  drafts!: number;

  @ApiProperty()
  totalRevisions!: number;
}
