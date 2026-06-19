import { fetchRelatedTitles } from "./related-api";

export interface AvailableSlugs {
  slug: string;
  slugVi: string;
  bumped: boolean;
}

export class SlugAvailabilityExhausted extends Error {
  constructor(public readonly slug: string, public readonly slugVi: string) {
    super(
      `Could not find a free slug for "${slug}" / "${slugVi}" within iteration cap`,
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
  slugVi: string,
): Promise<AvailableSlugs> {
  let candidateEn = slug;
  let candidateVi = slugVi;
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
      candidateVi = bumpSlug(slugVi, attemptVi);
    }
  }

  if (!resolved) {
    throw new SlugAvailabilityExhausted(slug, slugVi);
  }

  return {
    slug: candidateEn,
    slugVi: candidateVi,
    bumped: candidateEn !== slug || candidateVi !== slugVi,
  };
}
