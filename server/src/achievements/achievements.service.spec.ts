import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { AchievementService } from './achievements.service';
import { Achievement, AchievementType } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { GameProfile } from '../entities/GameProfile';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';

describe('AchievementService', () => {
  let service: AchievementService;
  let em: EntityManager;
  let r2StorageService: R2StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        {
          provide: EntityManager,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            assign: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: R2StorageService,
          useValue: {
            putObject: jest.fn(),
            deleteObject: jest.fn(),
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
    em = module.get<EntityManager>(EntityManager);
    r2StorageService = module.get<R2StorageService>(R2StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all achievements (Normal)', async () => {
      const achievements = [new Achievement()];
      jest.spyOn(em, 'find').mockResolvedValue(achievements);

      const result = await service.findAll();
      expect(result).toEqual(achievements);
    });
  });

  describe('findOne', () => {
    it('should return achievement if found (Normal)', async () => {
      const achievement = new Achievement();
      jest.spyOn(em, 'findOne').mockResolvedValue(achievement);
      jest.spyOn(em, 'count').mockResolvedValue(5);

      const result = await service.findOne('1');
      expect(result).toEqual(Object.assign(achievement, { earnedCount: 5 }));
    });

    it('should throw NotFoundException if not found (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow('achievements.not_found');
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
      jest.spyOn(em, 'findOne').mockResolvedValue(null);
      jest.spyOn(em, 'create').mockReturnValue(achievement);
      jest.spyOn(em, 'persistAndFlush').mockResolvedValue();

      const result = await service.create(dto);
      expect(result).toBeNull();
    });
  });

  describe('uploadBadge', () => {
    it('should upload a badge image to R2 and return the public URL (Normal)', async () => {
      const buffer = Buffer.from('fake-image');
      jest.spyOn(r2StorageService, 'putObject').mockResolvedValue(undefined as any);

      const result = await service.uploadBadge(buffer, 'image/png', 'badge.png');
      expect(result.startsWith('https://pub-x.r2.dev/achievement/')).toBe(true);
      expect(result.endsWith('.png')).toBe(true);
      expect(r2StorageService.putObject).toHaveBeenCalledWith(
        expect.stringContaining('achievement/'),
        buffer,
        'image/png',
      );
    });

    it('should throw BadRequestException if MIME type is invalid (Abnormal)', async () => {
      const buffer = Buffer.from('fake-file');
      await expect(service.uploadBadge(buffer, 'application/pdf', 'file.pdf')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete the achievement and its R2 badge image if badge image is on R2 (Normal)', async () => {
      const achievement = new Achievement();
      achievement.id = 'a1';
      achievement.badgeImageUrl = 'https://pub-x.r2.dev/achievement/some-uuid.png';

      jest.spyOn(service, 'findOne').mockResolvedValue(achievement as any);
      jest.spyOn(em, 'removeAndFlush').mockResolvedValue(undefined as any);
      jest.spyOn(r2StorageService, 'deleteObject').mockResolvedValue(undefined as any);

      await service.delete('a1');

      expect(r2StorageService.deleteObject).toHaveBeenCalledWith('achievement/some-uuid.png');
      expect(em.removeAndFlush).toHaveBeenCalledWith(achievement);
    });

    it('should delete the achievement but not call R2 deleteObject if badge image is not on R2 (Boundary)', async () => {
      const achievement = new Achievement();
      achievement.id = 'a1';
      achievement.badgeImageUrl = 'https://external-site.com/avatar.png';

      jest.spyOn(service, 'findOne').mockResolvedValue(achievement as any);
      jest.spyOn(em, 'removeAndFlush').mockResolvedValue(undefined as any);
      const deleteSpy = jest.spyOn(r2StorageService, 'deleteObject').mockClear();

      await service.delete('a1');

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(em.removeAndFlush).toHaveBeenCalledWith(achievement);
    });
  });
});