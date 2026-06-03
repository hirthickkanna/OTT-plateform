import { Link } from "react-router-dom";
import { normalizeUrl } from "../api/client";

export default function HeroBanner({ featured, onBrowsePlans }) {
  if (!featured) {
    return (
      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900 via-rose-950/30 to-zinc-950 px-8 py-20 sm:mx-6 lg:mx-10">
        <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white md:text-5xl">
          Unlimited movies, one elegant stream
        </h1>
        <p className="mt-4 max-w-md text-zinc-400">
          Sign in to get personalized picks, or explore plans to unlock premium titles.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex items-center rounded-lg bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={onBrowsePlans}
            className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
          >
            View plans
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-4 mt-4 h-[52vh] min-h-[320px] max-h-[520px] overflow-hidden rounded-2xl sm:mx-6 lg:mx-10">
      {featured.thumbnailUrl ? (
        <img
          src={normalizeUrl(featured.thumbnailUrl)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-rose-950/50 to-zinc-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-black/30" />

      <div className="relative flex h-full flex-col justify-end p-6 sm:p-10 md:p-12">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-rose-300">
          Featured movie
        </span>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
          {featured.title}
        </h1>
        {featured.description && (
          <p className="mt-3 max-w-lg line-clamp-2 text-sm text-zinc-300 md:text-base">
            {featured.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={`/watch/${featured._id}`}
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
            Subscription plans
          </button>
        </div>
      </div>
    </section>
  );
}
