import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import { CategoryService } from './categories.service';
import { CreateCategoryDto } from './dto/create-categories.dto';
import { UpdateCategoryDto } from './dto/update-categories.dto';
import {
  CategoryImageUploadRequestDto,
  CategoryImageUploadResponseDto,
} from './dto/category-image-upload.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { resolveLocale } from '../common/utils/resolve-locale';
import { getClientIp } from '../common/utils/client-ip.util';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all forum categories' })
  async findAll(
    @Req() req: Request,
    @Query('order') order?: 'asc' | 'desc',
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.categoryService.findAll(locale, order);
    return okResponse('category.list_success', data, 'GET /category');
  }

  @Public()
  @Get('unofficial')
  @ApiOperation({ summary: 'List all unofficial forum categories' })
  async findAllUnofficial(
    @Req() req: Request,
    @Query('order') order?: 'asc' | 'desc',
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.categoryService.findAllUnofficial(locale, order);
    return okResponse(
      'category.list_success',
      data,
      'GET /category/unofficial',
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.categoryService.findOne(id, locale);
    return okResponse('category.detail_success', data, `GET /category/${id}`);
  }

  @Roles('ADMIN')
  @Post('upload')
  @ApiOperation({
    summary: 'Create presigned upload URL for category icon image',
  })
  async uploadCategoryIcon(
    @Body() dto: CategoryImageUploadRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<CategoryImageUploadResponseDto>> {
    const data = await this.categoryService.uploadCategoryIcon(dto);
    return okResponse(
      'category.image_upload_url_created',
      data,
      'POST /category/upload',
    );
  }

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.create(
      createCategoryDto,
      user.userId,
      getClientIp(req),
    );
    return okResponse('category.create_success', data, 'POST /category');
  }

  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.update(
      id,
      updateCategoryDto,
      user.userId,
      getClientIp(req),
    );
    return okResponse('category.update_success', data, `PATCH /category/${id}`);
  }

  @Roles('ADMIN')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.remove(id, user.userId, getClientIp(req));
    return okResponse(
      'category.delete_success',
      data,
      `DELETE /category/${id}`,
    );
  }
}
