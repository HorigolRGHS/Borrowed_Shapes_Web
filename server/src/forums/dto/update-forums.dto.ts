import { PartialType } from '@nestjs/swagger';
import { CreateForumDto } from './create-forums.dto';

export class UpdateForumDto extends PartialType(CreateForumDto) {}
