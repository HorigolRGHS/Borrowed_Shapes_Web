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
    const rows = await this.em.execute(
      `
      select c."id", c."name", c."name_vi", c."slug", c."slug_vi",
             c."description", c."description_vi", c."iconUrl",
             c."isOfficial", c."displayOrder",
             count(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      group by c."id"
      order by c."displayOrder" asc
      `,
      [],
    );

    return rows.map((row: any) => ({
      ...row,
      threadCount: Number(row.threadCount || 0),
    }));
  }

  // Get category by ID
  async findOne(id: string) {
  const category = await this.em.findOne(ForumCategory, { id });
  if (!category) throw new NotFoundException('category.not_found');

  const countRes = await this.em.execute(
    `select count(1) as cnt from web."ForumThread" where "categoryId" = ?`,
    [id],
  );

  const threadCount = Number(countRes?.[0]?.cnt || 0);

  return {
    id: category.id,
    name: category.name,
    name_vi: category.nameVi,
    slug: category.slug,
    slug_vi: category.slugVi,
    description: category.description,
    description_vi: category.descriptionVi,
    iconUrl: category.iconUrl,
    isOfficial: category.isOfficial,
    displayOrder: category.displayOrder,
    threadCount,
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

    if (!slug) {throw new BadRequestException('category.slug_required');}
    if (!slugVi) {throw new BadRequestException('category.slug_vi_required');}

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
      name: dto.name.trim(),
      nameVi: dto.nameVi.trim(),
      slug,
      slugVi,
      description: dto.description?.trim() ?? null,
      descriptionVi: dto.descriptionVi?.trim() ?? null,
      iconUrl: dto.iconUrl ?? null,
      isOfficial: dto.isOfficial ?? false,
      displayOrder: dto.displayOrder ?? 0,
    });

    try {
    await this.em.persist(category).flush();
    return null;
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
  if (dto.nameVi !== undefined) {
    const trimmed = dto.nameVi.trim();

    if (!trimmed) {
      throw new BadRequestException('category.name_vi_required');
    }

    if (trimmed !== category.name_vi) {
      const existing = await this.em.findOne(ForumCategory, {
        nameVi: trimmed,
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
  if (dto.slugVi !== undefined) {
    const newSlugVi = this.slugify(dto.slugVi.trim() || category.name_vi);

    if (!newSlugVi) {
      throw new BadRequestException('category.slug_vi_required');
    }
    if (newSlugVi !== category.slug_vi) {
      const existing = await this.em.findOne(ForumCategory, {
        slugVi: newSlugVi,
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

  if (dto.descriptionVi !== undefined) {
    category.description_vi = dto.descriptionVi?.trim() ?? null;
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
  return null;
  }

  // Delete category
  async remove(id: string) {
    const category = await this.em.findOne(ForumCategory, { id });
    if (!category) throw new NotFoundException('category.not_found');
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
}
