import { Controller, Post, Delete, Body, Req, HttpCode, HttpStatus, UseGuards, Query, Get } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiTags } from '@nestjs/swagger';
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
import {
  VerifyEmailRequestDto,
  VerifyEmailResponseDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
} from './dto/password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  // @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @ApiBody({ type: RegisterRequestDto })
  async register(
    @Body() dto: RegisterRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RegisterResponseDto>> {
    const data = await this.authService.register(dto, req.ip ?? '');
    return okResponse('Registered successfully, please check your email for verification', data, `${req.method} ${req.path}`);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginRequestDto })
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'user-id:game:session-id' },
      },
      required: ['refreshToken'],
    },
  })
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logoutPost(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.logout(user.userId, user.platform, req.ip ?? '');
    return okResponse('Logged out successfully', null, `${req.method} ${req.path}`);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<VerifyEmailResponseDto>> {
    await this.authService.verifyEmail({ token });
    return okResponse(
      'Email verified successfully',
      { success: true, message: 'Email verified' },
      `${req.method} ${req.path}`,
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<ForgotPasswordResponseDto>> {
    await this.authService.forgotPassword(dto);
    return okResponse(
      'Password reset link sent to email',
      { success: true, message: 'Reset link sent' },
      `${req.method} ${req.path}`,
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ResetPasswordRequestDto })
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<ResetPasswordResponseDto>> {
    await this.authService.resetPassword(dto);
    return okResponse(
      'Password reset successfully',
      { success: true, message: 'Password reset' },
      `${req.method} ${req.path}`,
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ChangePasswordRequestDto })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<ChangePasswordResponseDto>> {
    await this.authService.changePassword(user.userId, dto);
    return okResponse(
      'Password changed successfully',
      { success: true, message: 'Password changed' },
      `${req.method} ${req.path}`,
    );
  }

  @Get('me')
  async me(
    @CurrentUser() user: RequestUser,
    @Query('include') include: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.authService.me(user.userId, user.platform, include);
    return okResponse('Current user', data, `${req.method} ${req.path}`);
  }
}
