import { fetchRelatedTitles } from "./related-api";

export interface AvailableSlugs {
  slug: string;
  slug_vi: string;
  bumped: boolean;
}

const MAX_BUMP_ITERATIONS = 50;

function bumpSlug(slug: string, attempt: number): string {
  if (attempt < 2) return slug;
  return `${slug}-${attempt}`;
}

export async function findAvailableSlugs(
  slug: string,
  slug_vi: string,
): Promise<AvailableSlugs> {
  let candidateEn = slug;
  let candidateVi = slug_vi;
  let attemptEn = 1;
  let attemptVi = 1;

  for (let i = 0; i < MAX_BUMP_ITERATIONS; i++) {
    const recheck = await fetchRelatedTitles([candidateEn, candidateVi]);
    const enTaken = recheck.get(candidateEn)?.exists;
    const viTaken = recheck.get(candidateVi)?.exists;
    if (!enTaken && !viTaken) break;
    if (enTaken) {
      attemptEn++;
      candidateEn = bumpSlug(slug, attemptEn);
    }
    if (viTaken) {
      attemptVi++;
      candidateVi = bumpSlug(slug_vi, attemptVi);
    }
  }

  return {
    slug: candidateEn,
    slug_vi: candidateVi,
    bumped: candidateEn !== slug || candidateVi !== slug_vi,
  };
}
