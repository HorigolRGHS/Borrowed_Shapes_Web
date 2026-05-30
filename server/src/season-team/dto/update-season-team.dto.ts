import { PartialType } from '@nestjs/swagger';
import { CreateSeasonTeamDto } from './create-season-team.dto';

export class UpdateSeasonTeamDto extends PartialType(CreateSeasonTeamDto) {}
