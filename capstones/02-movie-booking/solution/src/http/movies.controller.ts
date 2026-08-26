import { Controller, Get, Inject, Param } from "@nestjs/common";
import { NotFoundError } from "../domain/errors";
import type { BookingStore } from "../domain/types";
import { TOKENS } from "./tokens";

@Controller("movies")
export class MoviesController {
  constructor(@Inject(TOKENS.BookingStore) private readonly store: BookingStore) {}

  @Get()
  listMovies() {
    return this.store.tx((txv) => txv.listMovies());
  }

  @Get(":id/showings")
  async listShowings(@Param("id") id: string) {
    const showings = await this.store.tx(async (txv) => {
      const movies = await txv.listMovies();
      if (!movies.some((m) => m.id === id)) {
        throw new NotFoundError("MOVIE_NOT_FOUND", `No movie with id ${id}.`);
      }
      return txv.listShowingsByMovie(id);
    });
    return showings.map(toShowingDto);
  }
}

export interface ShowingDto {
  id: string;
  movieId: string;
  startsAt: string;
  rows: number;
  cols: number;
  seatCount: number;
  priceCents: number;
}

function toShowingDto(s: { id: string; movieId: string; startsAt: string; rows: number; cols: number; seatRefs: string[]; priceCents: number }): ShowingDto {
  return {
    id: s.id,
    movieId: s.movieId,
    startsAt: s.startsAt,
    rows: s.rows,
    cols: s.cols,
    seatCount: s.seatRefs.length,
    priceCents: s.priceCents,
  };
}
