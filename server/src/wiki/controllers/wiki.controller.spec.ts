import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { WikiController } from './wiki.controller';
import { WikiService } from '../services/wiki.service';
import { WikiRevisionService } from '../services/wiki-revision.service';

const mockReq = { method: 'GET', path: '/wiki/related' } as unknown as Request;

describe('WikiController.getRelatedTitles', () => {
  let controller: WikiController;
  let service: { findBySlugs: jest.Mock };

  beforeEach(async () => {
    service = { findBySlugs: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [WikiController],
      providers: [
        { provide: WikiService, useValue: service },
        { provide: WikiRevisionService, useValue: {} },
      ],
    }).compile();
    controller = moduleRef.get(WikiController);
  });

  it('parses, trims, dedupes the slug list', async () => {
    service.findBySlugs.mockResolvedValue([]);
    await controller.getRelatedTitles('a, b , a, ', mockReq);
    expect(service.findBySlugs).toHaveBeenCalledWith(['a', 'b']);
  });

  it('rejects payload with more than 30 slugs', async () => {
    const big = Array.from({ length: 31 }, (_, i) => `s${i}`).join(',');
    await expect(
      controller.getRelatedTitles(big, mockReq),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns empty data for empty query', async () => {
    service.findBySlugs.mockResolvedValue([]);
    const res = await controller.getRelatedTitles('', mockReq);
    expect(res.data).toEqual([]);
    expect(service.findBySlugs).toHaveBeenCalledWith([]);
  });
});
