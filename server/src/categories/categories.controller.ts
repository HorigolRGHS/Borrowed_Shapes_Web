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
} from '@nestjs/common';
import type { Request } from 'express';
import { CategoryService } from './categories.service';
import { CreateCategoryDto } from './dto/create-categories.dto';
import { UpdateCategoryDto } from './dto/update-categories.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, } from '@nestjs/swagger';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  // List all categories
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all forum categories' })
  async findAll(@Req() req: Request): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.findAll();
    return okResponse('category.list_success', data, 'GET /category');
  }

  // Get category detail
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.findOne(id);
    return okResponse('category.detail_success', data, `GET /category/${id}`);
  }

  // Create category
  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.create(createCategoryDto);
    return okResponse('category.create_success', data, 'POST /category');
  }

  // Update category (admin only)
  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.update(id, updateCategoryDto);
    return okResponse('category.update_success', data, `PATCH /category/${id}`);
  }

  // Delete category (admin only)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.categoryService.remove(id);
    return okResponse('category.delete_success', data, `DELETE /category/${id}`);
  }
}
