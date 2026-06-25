import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForumCategory } from '../entities/ForumCategory';
import { CreateCategoryDto } from './dto/create-categories.dto';
import { UpdateCategoryDto } from './dto/update-categories.dto';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { randomUUID } from 'crypto';
import { CategoryImageUploadRequestDto, CategoryImageUploadResponseDto } from './dto/category-image-upload.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly em: EntityManager,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
  ) { }

  // List all categories, sorted by displayOrder
  // List all categories, sorted alphabetically by name
  async findAll(locale: 'en' | 'vi', order: 'asc' | 'desc' = 'asc') {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField = locale === 'vi' ? 'c."description_vi"' : 'c."description"';
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      group by c."id"
      order by ${nameField} ${sortOrder}
      `,
      [],
    );

    return rows.map((row: any) => ({
      ...row,
      threadCount: Number(row.threadCount || 0),
    }));
  }

  // List all unofficial categories, sorted alphabetically by name
  async findAllUnofficial(locale: 'en' | 'vi', order: 'asc' | 'desc' = 'asc') {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField = locale === 'vi' ? 'c."description_vi"' : 'c."description"';
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      where c."isOfficial" = false
      group by c."id"
      order by ${nameField} ${sortOrder}
      `,
      [],
    );

    return rows.map((row: any) => ({
      ...row,
      threadCount: Number(row.threadCount || 0),
    }));
  }

  // Get category by ID
  async findOne(id: string, locale: 'en' | 'vi') {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField = locale === 'vi' ? 'c."description_vi"' : 'c."description"';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      where c."id" = ?
      group by c."id"
      `,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException('category.not_found');
    }

    const row = rows[0];
    return {
      ...row,
      threadCount: Number(row.threadCount || 0),
    };
  }

  // Create category
  async create(dto: CreateCategoryDto) {
    // Validate required fields
    if (!dto.name?.trim()) throw new BadRequestException('category.name_required');
    if (!dto.nameVi?.trim()) throw new BadRequestException('category.name_vi_required');

    // Sau này tạo helper rồi gọi, frontend cũng gọi helper đó để check trùng slug/name
    // Check slug uniqueness
    const slug = this.slugify(dto.slug?.trim() || dto.name);
    const slugVi = this.slugify(dto.slugVi?.trim() || dto.nameVi);

    if (!slug) { throw new BadRequestException('category.slug_required'); }
    if (!slugVi) { throw new BadRequestException('category.slug_vi_required'); }

    const existingSlug = await this.em.findOne(ForumCategory, { slug });
    if (existingSlug) throw new BadRequestException('category.slug_conflict');

    const existingSlugVi = await this.em.findOne(ForumCategory, { slugVi });
    if (existingSlugVi) throw new BadRequestException('category.slug_vi_conflict');

    // Check name uniqueness
    const existingName = await this.em.findOne(ForumCategory, { name: dto.name.trim() });
    if (existingName) throw new BadRequestException('category.name_conflict');

    const existingNameVi = await this.em.findOne(ForumCategory, { nameVi: dto.nameVi.trim() });
    if (existingNameVi) throw new BadRequestException('category.name_vi_conflict');

    // Create category
    const category = this.em.create(ForumCategory, {
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
      await this.em.persist(category).flush();
      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Update category
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.em.findOne(ForumCategory, { id });
    if (!category) throw new NotFoundException('category.not_found');

    // Update name
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();

      if (!trimmed) {
        throw new BadRequestException('category.name_required');
      }

      if (trimmed !== category.name) {
        const existing = await this.em.findOne(ForumCategory, {
          name: trimmed,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.name_conflict');
        }
      }

      category.name = trimmed;
    }

    // Update Vietnamese name
    if (dto.nameVi !== undefined) {
      const trimmed = dto.nameVi.trim();

      if (!trimmed) {
        throw new BadRequestException('category.name_vi_required');
      }

      if (trimmed !== category.nameVi) {
        const existing = await this.em.findOne(ForumCategory, {
          nameVi: trimmed,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.name_vi_conflict');
        }
      }

      category.nameVi = trimmed;
    }

    // Update slug
    if (dto.slug !== undefined) {
      const newSlug = this.slugify(dto.slug.trim() || category.name);

      if (!newSlug) {
        throw new BadRequestException('category.slug_required');
      }
      if (newSlug !== category.slug) {
        const existing = await this.em.findOne(ForumCategory, {
          slug: newSlug,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.slug_conflict');
        }

        category.slug = newSlug;
      }
    }

    // Update Vietnamese slug
    if (dto.slugVi !== undefined) {
      const newSlugVi = this.slugify(dto.slugVi.trim() || category.nameVi);

      if (!newSlugVi) {
        throw new BadRequestException('category.slug_vi_required');
      }
      if (newSlugVi !== category.slugVi) {
        const existing = await this.em.findOne(ForumCategory, {
          slugVi: newSlugVi,
        });

        if (existing && existing.id !== category.id) {
          throw new BadRequestException('category.slug_vi_conflict');
        }

        category.slugVi = newSlugVi;
      }
    }

    // Update descriptions
    if (dto.description !== undefined) {
      category.description = dto.description?.trim() ?? null;
    }

    if (dto.descriptionVi !== undefined) {
      category.descriptionVi = dto.descriptionVi?.trim() ?? null;
    }

    // Update icon
    if (dto.iconUrl !== undefined) {
      const oldIconUrl = category.iconUrl;
      const newIconUrl = dto.iconUrl ?? null;

      if (oldIconUrl && oldIconUrl !== newIconUrl) {
        try {
          const idx = oldIconUrl.indexOf('categories/');
          if (idx !== -1) {
            const key = oldIconUrl.slice(idx);
            await this.storageService.deleteObject(key);
          }
        } catch (e: any) {
          console.error(`Failed to delete old R2 category icon ${oldIconUrl}:`, e);
        }
      }

      category.iconUrl = newIconUrl;
    }

    // Update flags
    if (dto.isOfficial !== undefined) {
      category.isOfficial = dto.isOfficial;
    }

    await this.em.flush();
    return null;
  }

  // Delete category
  async remove(id: string) {
    const category = await this.em.findOne(ForumCategory, { id });
    if (!category) throw new NotFoundException('category.not_found');

    if (category.iconUrl) {
      try {
        const idx = category.iconUrl.indexOf('categories/');
        if (idx !== -1) {
          const key = category.iconUrl.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(`Failed to delete R2 category icon ${category.iconUrl}:`, e);
      }
    }

    await this.em.remove(category).flush();
    return null;
  }

  // Helper: generate slug from name
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

  async uploadCategoryIcon(dto: CategoryImageUploadRequestDto): Promise<CategoryImageUploadResponseDto> {
    const maxSize = 5 * 1024 * 1024; // 5MB
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
    const key = `categories/${categoryId}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService
      .get<string>('R2_PUBLIC_DEV_URL', 'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev')
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
