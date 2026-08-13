/**
 * UT_16 Compact Wiki Metadata — Report5 unit-test cases.
 * Each `it` name carries its UTCID so a run result maps to exactly one reported case.
 * Source under test: compactMetadata in ./wiki-metadata.dto
 */
import { compactMetadata } from './wiki-metadata.dto';

describe('UT_16 Compact Wiki Metadata', () => {
  it('UTCID01 - returns null for null input', () => {
    expect(compactMetadata(null)).toBeNull();
  });

  it('UTCID02 - returns null for undefined input', () => {
    expect(compactMetadata(undefined)).toBeNull();
  });

  it('UTCID03 - returns null when every field is empty', () => {
    expect(
      compactMetadata({ tags: [], tags_vi: [], stats: {}, relatedPages: [] }),
    ).toBeNull();
  });

  it('UTCID04 - keeps the category and non-empty tags', () => {
    expect(
      compactMetadata({ category: 'Item', tags: ['sword'], tags_vi: [] }),
    ).toEqual({ category: 'Item', tags: ['sword'] });
  });

  it('UTCID05 - drops an empty tags array but keeps the category', () => {
    expect(compactMetadata({ category: 'Item', tags: [] })).toEqual({
      category: 'Item',
    });
  });

  it('UTCID06 - drops an empty stats object but keeps the location', () => {
    expect(compactMetadata({ stats: {}, location: 'Hyrule' })).toEqual({
      location: 'Hyrule',
    });
  });

  it('UTCID07 - keeps both stats and stats_vi when non-empty', () => {
    expect(
      compactMetadata({ stats: { hp: 1 }, stats_vi: { 'thể lực': 1 } }),
    ).toEqual({ stats: { hp: 1 }, stats_vi: { 'thể lực': 1 } });
  });

  it('UTCID08 - keeps the infobox image and related pages', () => {
    expect(
      compactMetadata({
        infoboxImage: 'https://cdn.example.com/link.png',
        relatedPages: ['zelda'],
      }),
    ).toEqual({
      infoboxImage: 'https://cdn.example.com/link.png',
      relatedPages: ['zelda'],
    });
  });

  it('UTCID09 - drops undefined optional scalars', () => {
    expect(
      compactMetadata({
        category: 'Item',
        location: undefined,
        location_vi: undefined,
      }),
    ).toEqual({ category: 'Item' });
  });

  it('UTCID10 - keeps every non-empty field of the full metadata', () => {
    const result = compactMetadata({
      category: 'Character',
      tags: ['hero'],
      tags_vi: ['anh hùng'],
      infoboxImage: 'https://cdn.example.com/link.png',
      stats: { stamina: 1 },
      stats_vi: { 'thể lực': 1 },
      location: 'Hyrule',
      location_vi: 'Vương quốc Hyrule',
      relatedPages: ['princess-zelda'],
    });
    expect(result).toEqual({
      category: 'Character',
      tags: ['hero'],
      tags_vi: ['anh hùng'],
      infoboxImage: 'https://cdn.example.com/link.png',
      stats: { stamina: 1 },
      stats_vi: { 'thể lực': 1 },
      location: 'Hyrule',
      location_vi: 'Vương quốc Hyrule',
      relatedPages: ['princess-zelda'],
    });
  });
});
