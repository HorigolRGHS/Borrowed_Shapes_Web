import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { AnnouncementType } from '../../entities/AnnouncementType';

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 300, example: 'New Season Update' })
  @IsNotEmpty({ message: 'announcements.title_required' })
  @IsString({ message: 'announcements.title_must_be_string' })
  @MaxLength(300, { message: 'announcements.title_max_length' })
  title!: string;

  @ApiProperty({ maxLength: 300, example: 'Cập nhật mùa mới' })
  @IsNotEmpty({ message: 'announcements.title_vi_required' })
  @IsString({ message: 'announcements.title_vi_must_be_string' })
  @MaxLength(300, { message: 'announcements.title_vi_max_length' })
  title_vi!: string;

  @ApiProperty({ maxLength: 200, example: 'new-season-update' })
  @IsNotEmpty({ message: 'announcements.slug_required' })
  @IsString({ message: 'announcements.slug_must_be_string' })
  @MaxLength(200, { message: 'announcements.slug_max_length' })
  @Matches(/^[a-z0-9-]+$/, { message: 'announcements.invalid_slug' })
  slug!: string;

  @ApiProperty({ maxLength: 200, example: 'cap-nhat-mua-moi' })
  @IsNotEmpty({ message: 'announcements.slug_vi_required' })
  @IsString({ message: 'announcements.slug_vi_must_be_string' })
  @MaxLength(200, { message: 'announcements.slug_vi_max_length' })
  @Matches(/^[a-z0-9-]+$/, { message: 'announcements.invalid_slug_vi' })
  slug_vi!: string;

  @ApiPropertyOptional({ maxLength: 500, example: 'A brief summary of the announcement' })
  @IsOptional()
  @IsString({ message: 'announcements.summary_must_be_string' })
  @MaxLength(500, { message: 'announcements.summary_max_length' })
  summary?: string;

  @ApiPropertyOptional({ maxLength: 500, example: 'Tóm tắt ngắn gọn về thông báo' })
  @IsOptional()
  @IsString({ message: 'announcements.summary_vi_must_be_string' })
  @MaxLength(500, { message: 'announcements.summary_vi_max_length' })
  summary_vi?: string;

  @ApiProperty({ maxLength: 1_000_000, example: '<p>Full announcement content in HTML</p>' })
  @IsNotEmpty({ message: 'announcements.content_required' })
  @IsString({ message: 'announcements.content_must_be_string' })
  @MaxLength(1_000_000, { message: 'announcements.content_max_length' })
  content!: string;

  @ApiProperty({ maxLength: 1_000_000, example: '<p>Nội dung thông báo đầy đủ</p>' })
  @IsNotEmpty({ message: 'announcements.content_vi_required' })
  @IsString({ message: 'announcements.content_vi_must_be_string' })
  @MaxLength(1_000_000, { message: 'announcements.content_vi_max_length' })
  content_vi!: string;

  @ApiPropertyOptional({ enum: AnnouncementType, default: AnnouncementType.NEWS, example: 'NEWS' })
  @IsOptional()
  @IsEnum(AnnouncementType, { message: 'announcements.invalid_type' })
  type?: AnnouncementType;

  @ApiPropertyOptional({ default: false, example: false })
  @IsOptional()
  @IsBoolean({ message: 'announcements.is_pinned_must_be_boolean' })
  isPinned?: boolean;

  @ApiPropertyOptional({ default: false, example: true, description: 'If true, publishedAt defaults to now. If false with a future publishedAt, it will be auto-published at that time.' })
  @IsOptional()
  @IsBoolean({ message: 'announcements.is_published_must_be_boolean' })
  isPublished?: boolean;

  @ApiPropertyOptional({ example: '2026-06-10T09:00:00.000Z', description: 'Scheduled publish date. If isPublished is false, set a future date to auto-publish.' })
  @IsOptional()
  @IsDateString({}, { message: 'announcements.invalid_published_at' })
  publishedAt?: string;
}
