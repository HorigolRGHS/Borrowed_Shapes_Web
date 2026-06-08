import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForumCategory } from '../entities/ForumCategory';
import { CreateCategoryDto } from './dto/create-categories.dto';
import { UpdateCategoryDto } from './dto/update-categories.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly em: EntityManager) {}

  // List all categories, sorted by displayOrder
  async findAll() {
    const categories = await this.em.find(ForumCategory, {}, { orderBy: { displayOrder: 'asc' } });
    return categories;
  }

  // Get category by ID
  async findOne(id: string) {
    const category = await this.em.findOne(ForumCategory, { id });
    if (!category) throw new NotFoundException('category.not_found');
    return category;
  }

  // Create category
  async create(dto: CreateCategoryDto) {
    // Validate required fields
    if (!dto.name?.trim()) throw new BadRequestException('category.name_required');
    if (!dto.name_vi?.trim()) throw new BadRequestException('category.name_vi_required');

    // Sau này tạo helper rồi gọi, frontend cũng gọi helper đó để check trùng slug/name
    // Check slug uniqueness
    const slug = this.slugify(dto.slug?.trim() || dto.name);
    const slug_vi = this.slugify(dto.slug_vi?.trim() || dto.name_vi);

    if (!slug) {throw new BadRequestException('category.slug_required');}
    if (!slug_vi) {throw new BadRequestException('category.slug_vi_required');}

    const existingSlug = await this.em.findOne(ForumCategory, { slug });
    if (existingSlug) throw new BadRequestException('category.slug_conflict');

    const existingSlugVi = await this.em.findOne(ForumCategory, { slug_vi });
    if (existingSlugVi) throw new BadRequestException('category.slug_vi_conflict');

    // Check name uniqueness
    const existingName = await this.em.findOne(ForumCategory, { name: dto.name.trim() });
    if (existingName) throw new BadRequestException('category.name_conflict');

    const existingNameVi = await this.em.findOne(ForumCategory, { name_vi: dto.name_vi.trim() });
    if (existingNameVi) throw new BadRequestException('category.name_vi_conflict');

    // Create category
    const category = this.em.create(ForumCategory, {
      name: dto.name.trim(),
      name_vi: dto.name_vi.trim(),
      slug,
      slug_vi,
      description: dto.description?.trim() ?? null,
      description_vi: dto.description_vi?.trim() ?? null,
      iconUrl: dto.iconUrl ?? null,
      isOfficial: dto.isOfficial ?? false,
      displayOrder: dto.displayOrder ?? 0,
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
  const category = await this.findOne(id);

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
  if (dto.name_vi !== undefined) {
    const trimmed = dto.name_vi.trim();

    if (!trimmed) {
      throw new BadRequestException('category.name_vi_required');
    }

    if (trimmed !== category.name_vi) {
      const existing = await this.em.findOne(ForumCategory, {
        name_vi: trimmed,
      });

      if (existing && existing.id !== category.id) {
        throw new BadRequestException('category.name_vi_conflict');
      }
    }

    category.name_vi = trimmed;
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
  if (dto.slug_vi !== undefined) {
    const newSlugVi = this.slugify(dto.slug_vi.trim() || category.name_vi);

    if (!newSlugVi) {
      throw new BadRequestException('category.slug_vi_required');
    }
    if (newSlugVi !== category.slug_vi) {
      const existing = await this.em.findOne(ForumCategory, {
        slug_vi: newSlugVi,
      });

      if (existing && existing.id !== category.id) {
        throw new BadRequestException('category.slug_vi_conflict');
      }

      category.slug_vi = newSlugVi;
    }
  }

  // Update descriptions
  if (dto.description !== undefined) {
    category.description = dto.description?.trim() ?? null;
  }

  if (dto.description_vi !== undefined) {
    category.description_vi = dto.description_vi?.trim() ?? null;
  }

  // Update icon
  if (dto.iconUrl !== undefined) {
    category.iconUrl = dto.iconUrl ?? null;
  }

  // Update flags
  if (dto.isOfficial !== undefined) {
    category.isOfficial = dto.isOfficial;
  }

  if (dto.displayOrder !== undefined) {
    category.displayOrder = dto.displayOrder;
  }

  await this.em.flush();
  return category;
  }

  // Delete category
  async remove(id: string) {
    const category = await this.findOne(id);
    await this.em.removeAndFlush(category);
    return { success: true };
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
}
