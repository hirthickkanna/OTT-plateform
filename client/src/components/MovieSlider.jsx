import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { normalizeUrl } from "../api/client";

const SLIDE_COUNT = 4;
const AUTO_INTERVAL_MS = 6000;

function SlideBackground({ movie }) {
  if (movie.thumbnailUrl) {
    return (
      <img
        src={normalizeUrl(movie.thumbnailUrl)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  const initial = (movie.title || "?").charAt(0).toUpperCase();
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-rose-950/60 to-zinc-950 flex items-center justify-center">
      <span className="text-[12rem] font-bold text-white/5 select-none">{initial}</span>
    </div>
  );
}

export default function MovieSlider({ movies, onBrowsePlans }) {
  const slides = movies.slice(0, SLIDE_COUNT);
  const [active, setActive] = useState(0);

  const goTo = useCallback(
    (index) => {
      if (slides.length === 0) return;
      setActive(((index % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(next, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length, next]);

  if (slides.length === 0) {
    return (
      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900 via-rose-950/30 to-zinc-950 px-8 py-20 sm:mx-6 lg:mx-10">
        <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white md:text-5xl">
          Unlimited movies, one elegant stream
        </h1>
        <p className="mt-4 max-w-md text-zinc-400">Browse our catalog and start watching today.</p>
      </section>
    );
  }

  const current = slides[active];

  return (
    <section className="relative mx-4 mt-4 sm:mx-6 lg:mx-10">
      <div className="relative h-[52vh] min-h-[320px] max-h-[520px] overflow-hidden rounded-2xl border border-white/5 shadow-2xl shadow-black/50">
        {slides.map((movie, i) => (
          <div
            key={movie._id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={i !== active}
          >
            <SlideBackground movie={movie} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/55 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-black/40" />

            <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-10 md:p-12">
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-rose-300">
                {movie.genre || "Featured"}
              </span>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {movie.title}
              </h2>
              {movie.description && (
                <p className="mt-3 max-w-lg line-clamp-2 text-sm text-zinc-300 md:text-base">
                  {movie.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                {movie.year && <span>{movie.year}</span>}
                {movie.languages?.length > 0 && (
                  <span>{movie.languages.slice(0, 3).join(" · ")}</span>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={`/watch/${movie._id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch now
                </Link>
                <button
                  type="button"
                  onClick={onBrowsePlans}
                  className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
                >
                  View plans
                </button>
              </div>
            </div>
          </div>
        ))}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2.5 text-white backdrop-blur transition hover:bg-black/70 sm:left-5"
              aria-label="Previous slide"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/10 bg-black/50 p-2.5 text-white backdrop-blur transition hover:bg-black/70 sm:right-5"
              aria-label="Next slide"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-6">
              {slides.map((movie, i) => (
                <button
                  key={movie._id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? "w-8 bg-rose-500" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Go to slide ${i + 1}: ${movie.title}`}
                  aria-current={i === active}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-4">
          {slides.map((movie, i) => (
            <button
              key={movie._id}
              type="button"
              onClick={() => goTo(i)}
              className={`overflow-hidden rounded-xl border text-left transition-all ${
                i === active
                  ? "border-rose-500/50 ring-2 ring-rose-500/30"
                  : "border-white/5 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="aspect-video bg-zinc-900">
                {movie.thumbnailUrl ? (
                  <img src={normalizeUrl(movie.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-2xl font-bold text-white/20">
                    {movie.title.charAt(0)}
                  </div>
                )}
              </div>
              <p className="truncate px-3 py-2 text-xs font-medium text-zinc-300">{movie.title}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
