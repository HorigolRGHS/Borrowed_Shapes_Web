/**
 * UT_26 Validate Wiki Search Query — Report5 unit-test cases.
 * Each `it` name carries its UTCID so a run result maps to exactly one reported case.
 * Source under test: WikiSearchQueryDto decorators in ./wiki-search.dto
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WikiSearchQueryDto } from './wiki-search.dto';

/** Returns the constraint messages reported for `property`, or [] when it is accepted. */
async function errorsFor(
  property: 'q' | 'page' | 'limit',
  payload: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(WikiSearchQueryDto, { q: 'dragon', ...payload });
  const errors = await validate(dto);
  const target = errors.find((e) => e.property === property);
  return target ? Object.values(target.constraints ?? {}) : [];
}

describe('UT_26 Validate Wiki Search Query', () => {
  it('UTCID01 - accepts the typical query dragon', async () => {
    await expect(errorsFor('q', {})).resolves.toEqual([]);
  });

  it('UTCID02 - rejects an empty query as required', async () => {
    await expect(errorsFor('q', { q: '' })).resolves.toContain(
      'q should not be empty',
    );
  });

  it('UTCID03 - rejects an absent query as required', async () => {
    await expect(errorsFor('q', { q: undefined })).resolves.toContain(
      'q should not be empty',
    );
  });

  it('UTCID04 - accepts a query of exactly 500 characters', async () => {
    await expect(errorsFor('q', { q: 'a'.repeat(500) })).resolves.toEqual([]);
  });

  it('UTCID05 - rejects a query of 501 characters', async () => {
    await expect(errorsFor('q', { q: 'a'.repeat(501) })).resolves.toContain(
      'q must be shorter than or equal to 500 characters',
    );
  });

  it('UTCID06 - rejects a page of 0', async () => {
    await expect(errorsFor('page', { page: 0 })).resolves.toContain(
      'page must not be less than 1',
    );
  });

  it('UTCID07 - accepts a limit of exactly 50', async () => {
    await expect(errorsFor('limit', { limit: 50 })).resolves.toEqual([]);
  });

  it('UTCID08 - rejects a limit of 51', async () => {
    await expect(errorsFor('limit', { limit: 51 })).resolves.toContain(
      'limit must not be greater than 50',
    );
  });

  it('UTCID09 - rejects a numeric query', async () => {
    await expect(errorsFor('q', { q: 12345 })).resolves.toContain(
      'q must be a string',
    );
  });
});
