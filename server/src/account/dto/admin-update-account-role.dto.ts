import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../entities/Role';

export class AdminUpdateAccountRoleDto {
  @ApiProperty({ description: 'The new role for the user', enum: Role })
  @IsEnum(Role, { message: 'admin.account.role.validation.invalid_role' })
  role!: Role;
}
