import { Controller, Patch, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarUploadRequestDto, AvatarUploadResponseDto } from './dto/avatar-upload.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.updateProfile(user.userId, dto, req.ip ?? '');
    return okResponse('account.profile_updated', data, `${req.method} ${req.path}`);
  }

  @Post('avatar-upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AvatarUploadRequestDto })
  async getAvatarUploadUrl(
    @Body() dto: AvatarUploadRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AvatarUploadResponseDto>> {
    const data = await this.accountService.getAvatarUploadUrl(user.userId, dto);
    return okResponse('account.avatar_upload_url_created', data, `${req.method} ${req.path}`);
  }
}
