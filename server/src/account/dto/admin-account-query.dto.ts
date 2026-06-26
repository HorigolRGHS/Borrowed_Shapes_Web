import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AccountSortBy {
  ROLE = 'role',
  STATUS = 'status',
  ONLINE_STATUS = 'onlineStatus',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AccountFilterRole {
  ALL = 'ALL',
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AccountFilterStatus {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

export class AdminAccountQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by ID, email, or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AccountFilterRole, default: AccountFilterRole.ALL })
  @IsOptional()
  @IsEnum(AccountFilterRole)
  role?: AccountFilterRole = AccountFilterRole.ALL;

  @ApiPropertyOptional({ enum: AccountFilterStatus, default: AccountFilterStatus.ALL })
  @IsOptional()
  @IsEnum(AccountFilterStatus)
  status?: AccountFilterStatus = AccountFilterStatus.ALL;

  @ApiPropertyOptional({ enum: AccountSortBy, default: AccountSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(AccountSortBy)
  sortBy?: AccountSortBy = AccountSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.DESC;
}
