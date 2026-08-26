import { buildSeatRefs } from "../domain/seats";
import type { Movie, Showing } from "../domain/types";

export interface CatalogSeed {
  movies: Movie[];
  showings: Showing[];
}

/**
 * Deterministic seed so `pnpm start` gives you a curl-tourable cinema with
 * zero setup. All ids are prefixed "seed-" and dates are fixed, so examples
 * in the README never rot.
 */
export function seedCatalog(): CatalogSeed {
  return {
    movies: [
      { id: "seed-movie-1", title: "The Matrix" },
      { id: "seed-movie-2", title: "Spirited Away" },
    ],
    showings: [
      showing("seed-showing-1", "seed-movie-1", "2026-09-15T19:30:00.000Z", 5, 5, 1500),
      showing("seed-showing-2", "seed-movie-2", "2026-09-16T14:00:00.000Z", 3, 4, 900),
    ],
  };
}

function showing(id: string, movieId: string, startsAt: string, rows: number, cols: number, priceCents: number): Showing {
  return { id, movieId, startsAt, rows, cols, seatRefs: buildSeatRefs(rows, cols), priceCents };
}
