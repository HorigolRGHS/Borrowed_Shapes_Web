import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './categories.service';
import { ForumCategoryRepository } from './repositories/categories.repository';
import { R2StorageService } from '../storage/r2-storage.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: ForumCategoryRepository, useValue: {} },
        { provide: R2StorageService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

