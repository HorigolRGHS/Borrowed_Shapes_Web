/**
 * UT_15 Validate Wiki Metadata Fields — Report5 unit-test cases.
 * Each `it` name carries its UTCID so a run result maps to exactly one reported case.
 * Source under test: WikiMetadataDto decorators and constraints in ./wiki-metadata.dto
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WikiMetadataDto } from './wiki-metadata.dto';

/** Returns true when the metadata object passes every validator. */
async function accepts(input: unknown): Promise<boolean> {
  const dto = plainToInstance(WikiMetadataDto, input as object);
  const errors = await validate(dto, { whitelist: true });
  return errors.length === 0;
}

describe('UT_15 Validate Wiki Metadata Fields', () => {
  it('UTCID01 - accepts the happy-path full metadata', async () => {
    await expect(
      accepts({
        category: 'Character',
        tags: ['hero', 'warrior'],
        tags_vi: ['anh hùng'],
        infoboxImage: 'https://cdn.example.com/link.png',
        stats: { stamina: 1, weight: 2 },
        stats_vi: { 'thể lực': 1 },
        location: 'Hyrule',
        location_vi: 'Vương quốc Hyrule',
        relatedPages: ['princess-zelda', 'ganondorf'],
      }),
    ).resolves.toBe(true);
  });

  it('UTCID02 - accepts an empty object because every field is optional', async () => {
    await expect(accepts({})).resolves.toBe(true);
  });

  it('UTCID03 - rejects a category outside the known list', async () => {
    await expect(accepts({ category: 'NotACategory' })).resolves.toBe(false);
  });

  it('UTCID04 - rejects a tags array of 21 items', async () => {
    await expect(accepts({ tags: Array(21).fill('x') })).resolves.toBe(false);
  });

  it('UTCID05 - accepts a tag of exactly 40 characters', async () => {
    await expect(accepts({ tags: ['a'.repeat(40)] })).resolves.toBe(true);
  });

  it('UTCID06 - rejects a tag of 41 characters', async () => {
    await expect(accepts({ tags: ['a'.repeat(41)] })).resolves.toBe(false);
  });

  it('UTCID07 - rejects a stats record with a non-finite value', async () => {
    await expect(
      accepts({ stats: { hp: Number.POSITIVE_INFINITY } }),
    ).resolves.toBe(false);
  });

  it('UTCID08 - rejects a stats record with a string value', async () => {
    await expect(accepts({ stats: { hp: 'high' } })).resolves.toBe(false);
  });

  it('UTCID09 - rejects a stats record with an empty key', async () => {
    await expect(accepts({ stats: { '': 1 } })).resolves.toBe(false);
  });

  it('UTCID10 - accepts a stats record of exactly 50 keys', async () => {
    const stats = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`s${i}`, i]),
    );
    await expect(accepts({ stats })).resolves.toBe(true);
  });

  it('UTCID11 - rejects a stats record of 51 keys', async () => {
    const stats = Object.fromEntries(
      Array.from({ length: 51 }, (_, i) => [`s${i}`, i]),
    );
    await expect(accepts({ stats })).resolves.toBe(false);
  });

  it('UTCID12 - accepts the wiki image proxy path', async () => {
    await expect(
      accepts({
        tags: [],
        tags_vi: [],
        stats: {},
        relatedPages: [],
        infoboxImage: '/api/wiki/image/wiki/page-123/abc.png',
      }),
    ).resolves.toBe(true);
  });

  it('UTCID13 - rejects a malformed infobox image URL', async () => {
    await expect(accepts({ infoboxImage: 'not-a-url' })).resolves.toBe(false);
  });

  it('UTCID14 - rejects a relatedPages array of 31 items', async () => {
    await expect(accepts({ relatedPages: Array(31).fill('s') })).resolves.toBe(
      false,
    );
  });

  it('UTCID15 - rejects a location of 121 characters', async () => {
    await expect(accepts({ location: 'x'.repeat(121) })).resolves.toBe(false);
  });

  it('UTCID16 - accepts a location of exactly 120 characters', async () => {
    await expect(accepts({ location: 'x'.repeat(120) })).resolves.toBe(true);
  });
});
