import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { AchievementService } from './achievements.service';
import { Achievement, AchievementType } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { GameProfile } from '../entities/GameProfile';

describe('AchievementService', () => {
  let service: AchievementService;
  let em: EntityManager;

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
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
    em = module.get<EntityManager>(EntityManager);
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

      await expect(service.findOne('1')).rejects.toThrow('Achievement not found');
    });
  });

  describe('create', () => {
    it('should create and return achievement (Normal)', async () => {
      const dto = {
        name: 'Test',
        criteriaCode: 'TEST',
        badgeImageUrl: 'http://test.com',
        type: AchievementType.PERMANENT,
      };
      const achievement = new Achievement();
      jest.spyOn(em, 'create').mockReturnValue(achievement);
      jest.spyOn(em, 'persistAndFlush').mockResolvedValue();

      const result = await service.create(dto);
      expect(result).toEqual(achievement);
    });
  });

  // Add more tests as needed for other methods
});