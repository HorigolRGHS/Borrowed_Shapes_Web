import {
  Controller,
  Post,
  Delete,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  GoogleExchangeRequestDto,
  GoogleExchangeResponseDto,
  GoogleCompleteRequestDto,
  GoogleCompleteResponseDto,
} from './dto/google.dto';
import { RefreshRequestDto, RefreshResponseDto } from './dto/refresh.dto';
import { RegisterRequestDto, RegisterResponseDto } from './dto/register.dto';
import {
  VerifyEmailRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
} from './dto/password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from './decorators/roles.decorator';
import { getClientIp } from '../common/utils/client-ip.util';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  @ApiBody({ type: RegisterRequestDto })
  async register(
    @Body() dto: RegisterRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RegisterResponseDto>> {
    const data = await this.authService.register(dto, getClientIp(req));
    return okResponse(
      'auth.register_success',
      data,
      `${req.method} ${req.path}`,
    );
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
    const data = await this.authService.login(dto, getClientIp(req));
    return okResponse('auth.login_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('google/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: GoogleExchangeRequestDto })
  async googleExchange(
    @Body() dto: GoogleExchangeRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<GoogleExchangeResponseDto>> {
    const data = await this.authService.googleExchange(dto, getClientIp(req));
    return okResponse(
      'auth.google_exchange_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('google/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: GoogleCompleteRequestDto })
  async googleComplete(
    @Body() dto: GoogleCompleteRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<GoogleCompleteResponseDto>> {
    const data = await this.authService.googleComplete(dto, getClientIp(req));
    return okResponse('auth.login_success', data, `${req.method} ${req.path}`);
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
    return okResponse(
      'auth.token_refreshed',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.logout(user.userId, user.platform, getClientIp(req));
    return okResponse('auth.logout_success', null, `${req.method} ${req.path}`);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logoutPost(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.logout(user.userId, user.platform, getClientIp(req));
    return okResponse('auth.logout_success', null, `${req.method} ${req.path}`);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.verifyEmail({ token });
    return okResponse('auth.email_verified', null, `${req.method} ${req.path}`);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ForgotPasswordRequestDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.authService.forgotPassword(dto);
    return okResponse(
      'auth.password_reset_link_sent',
      null,
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
  ): Promise<ApiResponseDto<null>> {
    await this.authService.resetPassword(dto);
    return okResponse(
      'auth.password_reset_success',
      null,
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
  ): Promise<ApiResponseDto<null>> {
    await this.authService.changePassword(user.userId, dto, user.platform);
    return okResponse(
      'auth.password_changed_success',
      null,
      `${req.method} ${req.path}`,
    );
  }

  @Get('me')
  @ApiQuery({ name: 'include', required: false, type: String })
  async me(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Query('include') include?: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.authService.me(user.userId, user.platform, include);
    return okResponse('auth.current_user', data, `${req.method} ${req.path}`);
  }

  /// Tesst check role
  @Get('me-admin')
  @Roles('ADMIN')
  @ApiQuery({ name: 'include', required: false, type: String })
  async meAdmin(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Query('include') include?: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.authService.me(user.userId, user.platform, include);
    return okResponse('auth.current_user', data, `${req.method} ${req.path}`);
  }
}
