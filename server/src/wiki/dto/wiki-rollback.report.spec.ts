/**
 * UT_33 Validate Wiki Rollback — Report5 unit-test cases.
 * Each `it` name carries its UTCID so a run result maps to exactly one reported case.
 * Source under test: WikiRollbackRequestDto decorators in ./wiki-rollback.dto
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WikiRollbackRequestDto } from './wiki-rollback.dto';

const REV = '3bcdd74c-a56f-4e1a-ad62-581be8d9cdca';

/** Returns the constraint messages reported for `property`, or [] when it is accepted. */
async function errorsFor(
  property: 'targetRevisionId' | 'expectedLatestRevisionId',
  payload: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(WikiRollbackRequestDto, {
    targetRevisionId: REV,
    expectedLatestRevisionId: REV,
    ...payload,
  });
  const errors = await validate(dto);
  const target = errors.find((e) => e.property === property);
  return target ? Object.values(target.constraints ?? {}) : [];
}

describe('UT_33 Validate Wiki Rollback', () => {
  it('UTCID01 - accepts the typical revision pair', async () => {
    await expect(errorsFor('targetRevisionId', {})).resolves.toEqual([]);
  });

  it('UTCID02 - rejects an absent target revision as required', async () => {
    await expect(
      errorsFor('targetRevisionId', { targetRevisionId: undefined }),
    ).resolves.toContain('targetRevisionId should not be empty');
  });

  it('UTCID03 - rejects an empty target revision as required', async () => {
    await expect(
      errorsFor('targetRevisionId', { targetRevisionId: '' }),
    ).resolves.toContain('targetRevisionId should not be empty');
  });

  it('UTCID04 - rejects an absent latest revision as required', async () => {
    await expect(
      errorsFor('expectedLatestRevisionId', {
        expectedLatestRevisionId: undefined,
      }),
    ).resolves.toContain('expectedLatestRevisionId should not be empty');
  });

  it('UTCID05 - rejects a numeric target revision', async () => {
    await expect(
      errorsFor('targetRevisionId', { targetRevisionId: 12345 }),
    ).resolves.toContain('targetRevisionId must be a string');
  });

  it('UTCID06 - accepts a short revision string', async () => {
    await expect(
      errorsFor('targetRevisionId', { targetRevisionId: 'rev-1' }),
    ).resolves.toEqual([]);
  });
});
