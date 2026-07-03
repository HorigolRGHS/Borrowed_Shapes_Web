import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';
import { UploadReportMediaDto } from './dto/upload-report-media.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportStatus } from '../entities/ReportStatus';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a presigned URL to upload evidence media' })
  async uploadMedia(
    @Body() dto: UploadReportMediaDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.reportsService.uploadReportMedia(dto, user.userId);
    return okResponse('reports.upload_url_created', data, 'POST /reports/upload');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a report against a user, thread, or comment' })
  async create(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.reportsService.create(createReportDto, user.userId);
    return okResponse('reports.create_success', data, 'POST /reports');
  }

  @Get('my-reports')
  @ApiOperation({ summary: 'Get list of reports submitted by the logged-in user' })
  async findMyReports(@CurrentUser() user: RequestUser): Promise<ApiResponseDto<any>> {
    const data = await this.reportsService.findMyReports(user.userId);
    return okResponse('reports.my_list_success', data, 'GET /reports/my-reports');
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Admin: Get simple counts of reports grouped by status' })
  async getAdminStats(@CurrentUser() user: RequestUser): Promise<ApiResponseDto<any>> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('reports.forbidden_admin_only');
    }
    const data = await this.reportsService.getAdminStats();
    return okResponse('reports.stats_success', data, 'GET /reports/admin/stats');
  }

  @Get('admin/list')
  @ApiOperation({ summary: 'Admin: Filter and list reports' })
  async findAdminReports(
    @Query('status') status: string,
    @Query('sort') sort: 'asc' | 'desc',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('reports.forbidden_admin_only');
    }
    const activeStatus =
      status && status.trim() !== '' && status !== 'ALL'
        ? (status.toUpperCase() as ReportStatus)
        : undefined;
    const activeSort = sort === 'asc' ? 'asc' : 'desc';
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const data = await this.reportsService.findAdminReports(
      activeStatus,
      activeSort,
      pageNum,
      limitNum,
    );
    return okResponse('reports.admin_list_success', data, 'GET /reports/admin/list');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a report by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    const data = await this.reportsService.findOne(id, user.userId, isAdmin);
    return okResponse('reports.details_success', data, `GET /reports/${id}`);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Resolve report taking actions' })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('reports.forbidden_admin_only');
    }
    const data = await this.reportsService.resolve(id, user.userId, dto);
    return okResponse('reports.resolve_success', data, `POST /reports/${id}/resolve`);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Reject report' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectReportDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('reports.forbidden_admin_only');
    }
    const data = await this.reportsService.reject(id, user.userId, dto);
    return okResponse('reports.reject_success', data, `POST /reports/${id}/reject`);
  }
}
