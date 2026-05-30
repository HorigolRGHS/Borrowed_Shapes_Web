import { fetchRelatedTitles } from "./related-api";

export interface AvailableSlugs {
  slug: string;
  slug_vi: string;
  bumped: boolean;
}

export class SlugAvailabilityExhausted extends Error {
  constructor(public readonly slug: string, public readonly slug_vi: string) {
    super(
      `Could not find a free slug for "${slug}" / "${slug_vi}" within iteration cap`,
    );
    this.name = "SlugAvailabilityExhausted";
  }
}

const MAX_BUMP_ITERATIONS = 50;

function bumpSlug(slug: string, attempt: number): string {
  return attempt === 1 ? slug : `${slug}-${attempt}`;
}

export async function findAvailableSlugs(
  slug: string,
  slug_vi: string,
): Promise<AvailableSlugs> {
  let candidateEn = slug;
  let candidateVi = slug_vi;
  let attemptEn = 1;
  let attemptVi = 1;
  let resolved = false;

  for (let i = 0; i < MAX_BUMP_ITERATIONS; i++) {
    const recheck = await fetchRelatedTitles([candidateEn, candidateVi]);
    const enTaken = recheck.get(candidateEn)?.exists;
    const viTaken = recheck.get(candidateVi)?.exists;
    if (!enTaken && !viTaken) {
      resolved = true;
      break;
    }
    if (enTaken) {
      attemptEn++;
      candidateEn = bumpSlug(slug, attemptEn);
    }
    if (viTaken) {
      attemptVi++;
      candidateVi = bumpSlug(slug_vi, attemptVi);
    }
  }

  if (!resolved) {
    throw new SlugAvailabilityExhausted(slug, slug_vi);
  }

  return {
    slug: candidateEn,
    slug_vi: candidateVi,
    bumped: candidateEn !== slug || candidateVi !== slug_vi,
  };
}
