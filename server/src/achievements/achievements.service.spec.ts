import { Test, TestingModule } from '@nestjs/testing';
import {
  AchievementService,
  getEffectiveExpiresAt,
} from './achievements.service';
import { Achievement, AchievementType } from '../entities/Achievement';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { AchievementRepository } from './repositories/achievements.repository';

describe('AchievementService', () => {
  let service: AchievementService;
  let repository: AchievementRepository;
  let r2StorageService: R2StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: 'AuditService', useValue: {} },
        AchievementService,
        {
          provide: AchievementRepository,
          useValue: {
            findAll: jest.fn(),
            execute: jest.fn(),
            findOne: jest.fn(),
            findOneByCriteria: jest.fn(),
            findOneByCriteriaExcludeId: jest.fn(),
            countUserAchievements: jest.fn(),
            findUserAchievements: jest.fn(),
            findOneUserAchievement: jest.fn(),
            createAchievement: jest.fn(),
            createUserAchievement: jest.fn(),
            persistAndFlush: jest.fn(),
            assign: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
            findGameProfilesWithEquippedAchievements: jest.fn(),
          },
        },
        {
          provide: R2StorageService,
          useValue: {
            putObject: jest.fn(),
            deleteObject: jest.fn(),
            createUploadUrl: jest.fn(),
            objectExists: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'R2_PUBLIC_BASE_URL') return 'https://pub-x.r2.dev';
              return null;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'R2_PUBLIC_DEV_URL') return 'https://pub-x.r2.dev';
              throw new Error(`Config key ${key} not found`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
    repository = module.get<AchievementRepository>(AchievementRepository);
    r2StorageService = module.get<R2StorageService>(R2StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all achievements (Normal)', async () => {
      const achievements = [new Achievement()];
      jest.spyOn(repository, 'findAll').mockResolvedValue(achievements);

      const result = await service.findAll();
      expect(result).toEqual(achievements);
    });
  });

  describe('findOne', () => {
    it('should return achievement if found (Normal)', async () => {
      const achievement = new Achievement();
      jest.spyOn(repository, 'findOne').mockResolvedValue(achievement);
      jest.spyOn(repository, 'countUserAchievements').mockResolvedValue(5);

      const result = await service.findOne('1');
      expect(result).toEqual(Object.assign(achievement, { earnedCount: 5 }));
    });

    it('should throw NotFoundException if not found (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(
        'achievements.not_found',
      );
    });
  });

  describe('create', () => {
    it('should create and return null (Normal)', async () => {
      const dto = {
        name: 'Test',
        criteriaCode: 'TEST',
        badgeImageUrl: 'http://test.com',
        type: AchievementType.PERMANENT,
      };
      const achievement = new Achievement();
      jest.spyOn(repository, 'findOneByCriteria').mockResolvedValue(null);
      jest.spyOn(repository, 'createAchievement').mockReturnValue(achievement);
      jest.spyOn(repository, 'persistAndFlush').mockResolvedValue();

      const result = await service.create(dto);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update achievement and exclude id from assign (Normal)', async () => {
      const achievement = new Achievement();
      achievement.id = 'ach-123';
      achievement.name = 'Old Name';

      const dto = {
        id: 'ach-123',
        name: 'New Name',
        criteriaCode: 'NEW_CODE',
      };

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(Object.assign(achievement, { earnedCount: 0 }));
      jest
        .spyOn(repository, 'findOneByCriteriaExcludeId')
        .mockResolvedValue(null);
      jest
        .spyOn(repository, 'assign')
        .mockImplementation((entity: any, data: any): any => {
          expect(data.id).toBeUndefined(); // Verify ID is excluded!
          return Object.assign(entity, data);
        });
      jest.spyOn(repository, 'flush').mockResolvedValue();

      const result = await service.update('ach-123', dto as any);
      expect(result).toBeNull();
      expect(achievement.name).toBe('New Name');
      expect(repository.flush).toHaveBeenCalled();
    });

    it('should throw BadRequestException if criteriaCode already exists on another achievement (Abnormal)', async () => {
      const achievement = new Achievement();
      achievement.id = 'ach-123';

      const dto = {
        criteriaCode: 'DUPLICATE_CODE',
      };

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(Object.assign(achievement, { earnedCount: 0 }));
      jest
        .spyOn(repository, 'findOneByCriteriaExcludeId')
        .mockResolvedValue(new Achievement());

      await expect(service.update('ach-123', dto as any)).rejects.toThrow(
        'achievements.already_exists',
      );
    });

    it('should throw NotFoundException if achievement does not exist (Boundary)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.update('ach-999', {} as any)).rejects.toThrow(
        'achievements.not_found',
      );
    });
  });

  describe('createUploadUrl', () => {
    it('should create upload URL when file size and type are valid (Normal)', async () => {
      const dto = {
        fileName: 'badge.png',
        achievementId: 'ach-123',
        fileSize: 100 * 1024,
        mimeType: 'image/png',
      };
      jest
        .spyOn(r2StorageService, 'createUploadUrl')
        .mockResolvedValue('https://put-url.com');

      const result = await service.createUploadUrl(dto);
      expect(result.uploadUrl).toBe('https://put-url.com');
      expect(result.key.startsWith('achievement/ach-123/')).toBe(true);
      expect(result.key.endsWith('.png')).toBe(true);
      expect(
        result.publicUrl.startsWith(
          'https://pub-x.r2.dev/achievement/ach-123/',
        ),
      ).toBe(true);
      expect(result.method).toBe('PUT');
      expect(result.headers['Content-Type']).toBe('image/png');
    });

    it('should throw BadRequestException if MIME type is invalid (Abnormal)', async () => {
      const dto = {
        fileName: 'badge.pdf',
        achievementId: 'ach-123',
        fileSize: 100 * 1024,
        mimeType: 'application/pdf',
      };
      await expect(service.createUploadUrl(dto)).rejects.toThrow(
        'achievements.upload_invalid_type',
      );
    });

    it('should throw BadRequestException if file size exceeds limit (Boundary)', async () => {
      const dto = {
        fileName: 'badge.png',
        achievementId: 'ach-123',
        fileSize: 6 * 1024 * 1024, // 6MB
        mimeType: 'image/png',
      };
      await expect(service.createUploadUrl(dto)).rejects.toThrow(
        'achievements.upload_too_large',
      );
    });
  });

  describe('confirmUpload', () => {
    it('should confirm upload, update achievement badgeImageUrl and delete old R2 object if valid (Normal)', async () => {
      const dto = {
        achievementId: 'ach-123',
        filePath: 'achievement/ach-123/new-file.png',
        mimeType: 'image/png',
        fileSize: 100 * 1024,
        oldBadgeImageUrl:
          'https://pub-x.r2.dev/achievement/ach-123/old-file.png',
      };

      const achievement = new Achievement();
      achievement.id = 'ach-123';
      achievement.badgeImageUrl = dto.oldBadgeImageUrl;

      jest.spyOn(r2StorageService, 'objectExists').mockResolvedValue(true);
      jest.spyOn(repository, 'findOne').mockResolvedValue(achievement);
      jest.spyOn(repository, 'flush').mockResolvedValue();
      jest
        .spyOn(r2StorageService, 'deleteObject')
        .mockResolvedValue(undefined as any);

      const result = await service.confirmUpload(dto);
      expect(result.url).toBe(
        'https://pub-x.r2.dev/achievement/ach-123/new-file.png',
      );
      expect(achievement.badgeImageUrl).toBe(
        'https://pub-x.r2.dev/achievement/ach-123/new-file.png',
      );
      expect(r2StorageService.deleteObject).toHaveBeenCalledWith(
        'achievement/ach-123/old-file.png',
      );
      expect(repository.flush).toHaveBeenCalled();
    });

    it('should throw BadRequestException if filePath does not match expected prefix (Abnormal)', async () => {
      const dto = {
        achievementId: 'ach-123',
        filePath: 'achievement/other-id/new-file.png',
        mimeType: 'image/png',
        fileSize: 100 * 1024,
      };

      await expect(service.confirmUpload(dto)).rejects.toThrow(
        'achievements.invalid_file_path',
      );
    });

    it('should throw NotFoundException if file does not exist on R2 (Abnormal)', async () => {
      const dto = {
        achievementId: 'ach-123',
        filePath: 'achievement/ach-123/new-file.png',
        mimeType: 'image/png',
        fileSize: 100 * 1024,
      };
      jest.spyOn(r2StorageService, 'objectExists').mockResolvedValue(false);

      await expect(service.confirmUpload(dto)).rejects.toThrow(
        'achievements.file_not_found_on_storage',
      );
    });

    it('should confirm upload and return the public URL successfully even if the achievement is not found in database (Boundary)', async () => {
      const dto = {
        achievementId: 'ach-123',
        filePath: 'achievement/ach-123/new-file.png',
        mimeType: 'image/png',
        fileSize: 100 * 1024,
      };

      jest.spyOn(r2StorageService, 'objectExists').mockResolvedValue(true);
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await service.confirmUpload(dto);
      expect(result.url).toBe(
        'https://pub-x.r2.dev/achievement/ach-123/new-file.png',
      );
    });
  });

  describe('delete', () => {
    it('should delete the achievement and its R2 badge image if badge image is on R2 (Normal)', async () => {
      const achievement = new Achievement();
      achievement.id = 'a1';
      achievement.badgeImageUrl =
        'https://pub-x.r2.dev/achievement/some-uuid.png';

      jest.spyOn(service, 'findOne').mockResolvedValue(achievement as any);
      jest
        .spyOn(repository, 'findGameProfilesWithEquippedAchievements')
        .mockResolvedValue([]);
      jest.spyOn(repository, 'flush').mockResolvedValue();
      jest
        .spyOn(repository, 'removeAndFlush')
        .mockResolvedValue(undefined as any);
      jest
        .spyOn(r2StorageService, 'deleteObject')
        .mockResolvedValue(undefined as any);

      await service.delete('a1');

      expect(r2StorageService.deleteObject).toHaveBeenCalledWith(
        'achievement/some-uuid.png',
      );
      expect(repository.removeAndFlush).toHaveBeenCalledWith(achievement);
    });

    it('should delete the achievement but not call R2 deleteObject if badge image is not on R2 (Boundary)', async () => {
      const achievement = new Achievement();
      achievement.id = 'a1';
      achievement.badgeImageUrl = 'https://external-site.com/avatar.png';

      jest.spyOn(service, 'findOne').mockResolvedValue(achievement as any);
      jest
        .spyOn(repository, 'findGameProfilesWithEquippedAchievements')
        .mockResolvedValue([]);
      jest.spyOn(repository, 'flush').mockResolvedValue();
      jest
        .spyOn(repository, 'removeAndFlush')
        .mockResolvedValue(undefined as any);
      const deleteSpy = jest
        .spyOn(r2StorageService, 'deleteObject')
        .mockClear();

      await service.delete('a1');

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(repository.removeAndFlush).toHaveBeenCalledWith(achievement);
    });
  });

  describe('getEffectiveExpiresAt', () => {
    it('should_return_original_expiresAt_when_type_is_not_SEASONAL (Normal)', () => {
      const originalExpiresAt = new Date('2026-12-31T23:59:59.000Z');
      const result = getEffectiveExpiresAt(
        'PERMANENT',
        null,
        originalExpiresAt,
      );
      expect(result).toEqual(originalExpiresAt);
    });

    it('should_return_end_of_following_month_for_SEASONAL_achievement (Normal)', () => {
      // April 2026 -> expiry should be end of May 2026 (May 31st)
      const seasonMonth = '2026-04-01';
      const result = getEffectiveExpiresAt('SEASONAL', seasonMonth, null);
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(4); // May (0-indexed)
      expect(result?.getUTCDate()).toBe(31);
      expect(result?.getUTCHours()).toBe(23);
      expect(result?.getUTCMinutes()).toBe(59);
      expect(result?.getUTCSeconds()).toBe(59);
    });

    it('should_fallback_to_expiresAt_and_add_one_month_if_seasonMonth_is_missing (Abnormal)', () => {
      // Original expiresAt is end of April (2026-04-30 23:59:59)
      const originalExpiresAt = new Date('2026-04-30T23:59:59.000Z');
      const result = getEffectiveExpiresAt('SEASONAL', null, originalExpiresAt);
      expect(result?.getUTCFullYear()).toBe(2026);
      expect(result?.getUTCMonth()).toBe(4); // May (0-indexed)
      expect(result?.getUTCDate()).toBe(31);
    });

    it('should_correctly_wrap_year_when_seasonMonth_is_December (Boundary)', () => {
      // December 2026 -> expiry should be end of January 2027 (January 31st)
      const seasonMonth = '2026-12-01';
      const result = getEffectiveExpiresAt('SEASONAL', seasonMonth, null);
      expect(result?.getUTCFullYear()).toBe(2027);
      expect(result?.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(result?.getUTCDate()).toBe(31);
    });
  });
});
