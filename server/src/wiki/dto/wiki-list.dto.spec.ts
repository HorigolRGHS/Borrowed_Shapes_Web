import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WikiListQueryDto } from './wiki-list.dto';

async function categoryErrors(category: unknown): Promise<string[]> {
  const dto = plainToInstance(WikiListQueryDto, { category });
  const errors = await validate(dto);
  const target = errors.find((error) => error.property === 'category');
  return target ? Object.values(target.constraints ?? {}) : [];
}

async function statusErrors(status: unknown): Promise<string[]> {
  const dto = plainToInstance(WikiListQueryDto, { status });
  const errors = await validate(dto);
  const target = errors.find((error) => error.property === 'status');
  return target ? Object.values(target.constraints ?? {}) : [];
}

describe('WikiListQueryDto category', () => {
  it('accepts a supported category', async () => {
    await expect(categoryErrors('Character')).resolves.toEqual([]);
  });

  it('rejects an unsupported category', async () => {
    await expect(categoryErrors('Enemy')).resolves.not.toEqual([]);
  });
});

describe('WikiListQueryDto status', () => {
  it.each(['all', 'published', 'draft'])('accepts %s', async (status) => {
    await expect(statusErrors(status)).resolves.toEqual([]);
  });

  it('rejects an unsupported status', async () => {
    await expect(statusErrors('archived')).resolves.not.toEqual([]);
  });
});
