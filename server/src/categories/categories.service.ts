import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ForumCategory } from '../entities/ForumCategory';
import { CreateCategoryDto } from './dto/create-categories.dto';
import { UpdateCategoryDto } from './dto/update-categories.dto';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { randomUUID } from 'crypto';
import {
  CategoryImageUploadRequestDto,
  CategoryImageUploadResponseDto,
} from './dto/category-image-upload.dto';
import { ForumCategoryRepository } from './repositories/categories.repository';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: ForumCategoryRepository,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(locale: 'en' | 'vi', order: 'asc' | 'desc' = 'asc') {
    return this.categoryRepository.findAllCategories(locale, order);
  }

  async findAllUnofficial(locale: 'en' | 'vi', order: 'asc' | 'desc' = 'asc') {
    return this.categoryRepository.findAllUnofficialCategories(locale, order);
  }

  async findOne(id: string, locale: 'en' | 'vi') {
    const category = await this.categoryRepository.findOneCategory(id, locale);
    if (!category) {
      throw new NotFoundException('category.not_found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    if (!dto.name?.trim())
      throw new BadRequestException('category.name_required');
    if (!dto.nameVi?.trim())
      throw new BadRequestException('category.name_vi_required');

    const slug = this.slugify(dto.slug?.trim() || dto.name);
    const slugVi = this.slugify(dto.slugVi?.trim() || dto.nameVi);

    if (!slug) {
      throw new BadRequestException('category.slug_required');
    }
    if (!slugVi) {
      throw new BadRequestException('category.slug_vi_required');
    }

    const existingSlug = await this.categoryRepository.findOne({ slug });
    if (existingSlug) throw new BadRequestException('category.slug_conflict');

    const existingSlugVi = await this.categoryRepository.findOne({ slugVi });
    if (existingSlugVi)
      throw new BadRequestException('category.slug_vi_conflict');

    const existingName = await this.categoryRepository.findOne({
      name: dto.name.trim(),
    });
    if (existingName) throw new BadRequestException('category.name_conflict');

    const existingNameVi = await this.categoryRepository.findOne({
      nameVi: dto.nameVi.trim(),
    });
    if (existingNameVi)
      throw new BadRequestException('category.name_vi_conflict');

    const category = this.categoryRepository.create({
      id: dto.id || undefined,
      name: dto.name.trim(),
      nameVi: dto.nameVi.trim(),
      slug,
      slugVi,
      description: dto.description?.trim() ?? null,
      descriptionVi: dto.descriptionVi?.trim() ?? null,
      iconUrl: dto.iconUrl ?? null,
      isOfficial: dto.isOfficial ?? false,
    });

    try {
      await this.categoryRepository
        .getEntityManager()
        .persist(category)
        .flush();
      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ id });
    if (!category) throw new NotFoundException('category.not_found');

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();

      if (!trimmed) {
        throw new BadRequestException('category.name_required');
      }

      if (trimmed !== category.name) {
        const existing = await this.categoryRepository.findOne({
          name: trimmed,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.name_conflict');
        }
      }

      category.name = trimmed;
    }

    if (dto.nameVi !== undefined) {
      const trimmed = dto.nameVi.trim();

      if (!trimmed) {
        throw new BadRequestException('category.name_vi_required');
      }

      if (trimmed !== category.nameVi) {
        const existing = await this.categoryRepository.findOne({
          nameVi: trimmed,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.name_vi_conflict');
        }
      }

      category.nameVi = trimmed;
    }

    if (dto.slug !== undefined) {
      const newSlug = this.slugify(dto.slug.trim() || category.name);

      if (!newSlug) {
        throw new BadRequestException('category.slug_required');
      }
      if (newSlug !== category.slug) {
        const existing = await this.categoryRepository.findOne({
          slug: newSlug,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.slug_conflict');
        }

        category.slug = newSlug;
      }
    }

    if (dto.slugVi !== undefined) {
      const newSlugVi = this.slugify(dto.slugVi.trim() || category.nameVi);

      if (!newSlugVi) {
        throw new BadRequestException('category.slug_vi_required');
      }
      if (newSlugVi !== category.slugVi) {
        const existing = await this.categoryRepository.findOne({
          slugVi: newSlugVi,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.slug_vi_conflict');
        }

        category.slugVi = newSlugVi;
      }
    }

    if (dto.description !== undefined) {
      category.description = dto.description?.trim() ?? null;
    }

    if (dto.descriptionVi !== undefined) {
      category.descriptionVi = dto.descriptionVi?.trim() ?? null;
    }

    let iconToDelete: string | null = null;
    if (dto.iconUrl !== undefined) {
      const oldIconUrl = category.iconUrl;
      const newIconUrl = dto.iconUrl ?? null;

      if (oldIconUrl && oldIconUrl !== newIconUrl) {
        iconToDelete = oldIconUrl;
      }

      category.iconUrl = newIconUrl;
    }

    if (dto.isOfficial !== undefined) {
      category.isOfficial = dto.isOfficial;
    }

    await this.categoryRepository.getEntityManager().flush();

    if (iconToDelete) {
      try {
        const idx = iconToDelete.indexOf('categories/');
        if (idx !== -1) {
          const key = iconToDelete.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(
          `Failed to delete old R2 category icon ${iconToDelete}:`,
          e,
        );
      }
    }

    return null;
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOne({ id });
    if (!category) throw new NotFoundException('category.not_found');

    const iconUrlToDelete = category.iconUrl;

    await this.categoryRepository.getEntityManager().removeAndFlush(category);

    if (iconUrlToDelete) {
      try {
        const idx = iconUrlToDelete.indexOf('categories/');
        if (idx !== -1) {
          const key = iconUrlToDelete.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(
          `Failed to delete R2 category icon ${iconUrlToDelete}:`,
          e,
        );
      }
    }
    return null;
  }

  private slugify(s: string): string {
    if (!s) return '';
    const normalized = s.normalize('NFD');
    const withoutAccents = normalized
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .replace(/[\u0300-\u036f]/g, '');
    const lowercase = withoutAccents.toLowerCase();
    const withDashes = lowercase.replace(/\s+/g, '-');
    const cleaned = withDashes.replace(/[^a-z0-9\-_]/g, '');
    const trimmed = cleaned.replace(/^-+|-+$/g, '');
    return trimmed.slice(0, 200);
  }

  async uploadCategoryIcon(
    dto: CategoryImageUploadRequestDto,
  ): Promise<CategoryImageUploadResponseDto> {
    const maxSize = 5 * 1024 * 1024;
    if (dto.fileSize > maxSize) {
      throw new BadRequestException('category.image_too_large');
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const categoryId = dto.categoryId ?? randomUUID();
    const ext = extByMime[dto.mimeType] ?? 'png';
    const key = `categories/${categoryId}-${Date.now()}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService
      .getOrThrow<string>('R2_PUBLIC_DEV_URL')
      .replace(/\/+$/, '');

    return {
      uploadUrl,
      method: 'PUT',
      key,
      publicUrl: `${publicUrlBase}/${key}`,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }
}
