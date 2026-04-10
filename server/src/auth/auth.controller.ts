import { Controller, Post, Delete, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  RefreshRequestDto,
  RefreshResponseDto,
} from './dto/refresh.dto';
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto/register.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  // @UseGuards(AuthRateLimitGuard)
  @Post('register')
  async register(
    @Body() dto: RegisterRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RegisterResponseDto>> {
    const data = await this.authService.register(dto, req.ip ?? '');
    return okResponse('Registered successfully', data, `${req.method} ${req.path}`);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<LoginResponseDto>> {
    const data = await this.authService.login(dto, req.ip ?? '');
    return okResponse('Logged in successfully', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RefreshResponseDto>> {
    const data = await this.authService.refresh(dto.refreshToken);
    return okResponse('Token refreshed successfully', data, `${req.method} ${req.path}`);
  }

  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.logout(user.userId, user.platform, req.ip ?? '');
    return okResponse('Logged out successfully', null, `${req.method} ${req.path}`);
  }
}
