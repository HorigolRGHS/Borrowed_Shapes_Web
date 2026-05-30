import { IsIn } from 'class-validator';

export class VoteDto {
  @IsIn([1, -1])
  value!: 1 | -1;
}