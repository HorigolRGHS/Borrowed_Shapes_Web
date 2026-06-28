import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WikiMetadataDto } from './wiki-metadata.dto';
import { wikiMetadataSchema } from '@models/dtos/wiki-metadata.dto';

interface Fixture {
  name: string;
  input: unknown;
  expected: 'pass' | 'fail';
}

const fixtures: Fixture[] = [
  {
    name: 'empty object (with required defaults)',
    input: { tags: [], tags_vi: [], stats: {}, relatedPages: [] },
    expected: 'pass',
  },
  {
    name: 'happy path full',
    input: {
      category: 'Character',
      tags: ['hero', 'warrior'],
      tags_vi: ['anh hùng'],
      infoboxImage: 'https://cdn.example.com/link.png',
      stats: { stamina: 1, weight: 2 },
      location: 'Hyrule',
      location_vi: 'Vương quốc Hyrule',
      relatedPages: ['princess-zelda', 'ganondorf'],
    },
    expected: 'pass',
  },
  { name: 'unknown category', input: { category: 'NotACategory' }, expected: 'fail' },
  { name: 'oversized tags array', input: { tags: Array(21).fill('x') }, expected: 'fail' },
  { name: 'tag too long', input: { tags: ['x'.repeat(41)] }, expected: 'fail' },
  {
    name: 'wiki proxy image path',
    input: {
      tags: [],
      tags_vi: [],
      stats: {},
      relatedPages: [],
      infoboxImage: '/api/wiki/image/wiki/page-123/abc.png',
    },
    expected: 'pass',
  },
  { name: 'malformed url', input: { infoboxImage: 'not-a-url' }, expected: 'fail' },
  { name: 'non-finite stat', input: { stats: { hp: Number.POSITIVE_INFINITY } }, expected: 'fail' },
  { name: 'string stat value', input: { stats: { hp: 'high' } }, expected: 'fail' },
  { name: 'empty stat key', input: { stats: { '': 1 } }, expected: 'fail' },
  { name: 'oversized relatedPages', input: { relatedPages: Array(31).fill('s') }, expected: 'fail' },
  { name: 'location too long', input: { location: 'x'.repeat(121) }, expected: 'fail' },
];

describe('WikiMetadata schema parity', () => {
  for (const f of fixtures) {
    it(`${f.name}: both schemas agree (${f.expected})`, async () => {
      const zodResult = wikiMetadataSchema.safeParse(f.input);

      const dto = plainToInstance(WikiMetadataDto, f.input as object);
      const errors = await validate(dto, { whitelist: true });
      const cvOk = errors.length === 0;

      if (f.expected === 'pass') {
        expect(zodResult.success).toBe(true);
        expect(cvOk).toBe(true);
      } else {
        expect(zodResult.success || cvOk).toBe(false);
      }
    });
  }

  it('strict mode: zod rejects unknown key', () => {
    const r = wikiMetadataSchema.safeParse({ category: 'Item', mystery: 1 });
    expect(r.success).toBe(false);
  });

  it('forbidNonWhitelisted rejects unknown key', async () => {
    const dto = plainToInstance(WikiMetadataDto, { mystery: 1 } as object);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
