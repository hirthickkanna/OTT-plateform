import MovieCard from "./MovieCard";

// Genre → cinematic gradient + accent color
const GENRE_THEMES = {
  Action:       { gradient: "from-rose-950 via-orange-950 to-zinc-950", accent: "text-orange-400", dot: "bg-orange-500" },
  Comedy:       { gradient: "from-yellow-950 via-amber-950 to-zinc-950", accent: "text-yellow-400", dot: "bg-yellow-500" },
  Drama:        { gradient: "from-violet-950 via-purple-950 to-zinc-950", accent: "text-violet-400", dot: "bg-violet-500" },
  Horror:       { gradient: "from-zinc-950 via-green-950 to-zinc-950", accent: "text-green-400", dot: "bg-green-600" },
  "Sci-Fi":     { gradient: "from-blue-950 via-cyan-950 to-zinc-950", accent: "text-cyan-400", dot: "bg-cyan-500" },
  Thriller:     { gradient: "from-zinc-950 via-slate-950 to-rose-950", accent: "text-rose-400", dot: "bg-rose-500" },
  Romance:      { gradient: "from-pink-950 via-rose-950 to-zinc-950", accent: "text-pink-400", dot: "bg-pink-500" },
  Documentary:  { gradient: "from-zinc-950 via-stone-950 to-zinc-900", accent: "text-stone-400", dot: "bg-stone-500" },
  Animation:    { gradient: "from-emerald-950 via-teal-950 to-zinc-950", accent: "text-emerald-400", dot: "bg-emerald-500" },
  Fantasy:      { gradient: "from-indigo-950 via-violet-950 to-zinc-950", accent: "text-indigo-400", dot: "bg-indigo-500" },
  Mystery:      { gradient: "from-zinc-950 via-purple-950 to-slate-950", accent: "text-purple-400", dot: "bg-purple-500" },
  Adventure:    { gradient: "from-amber-950 via-orange-950 to-zinc-950", accent: "text-amber-400", dot: "bg-amber-500" },
  Biography:    { gradient: "from-zinc-950 via-zinc-900 to-slate-950", accent: "text-zinc-400", dot: "bg-zinc-500" },
  Crime:        { gradient: "from-zinc-950 via-red-950 to-zinc-950", accent: "text-red-400", dot: "bg-red-500" },
  History:      { gradient: "from-stone-950 via-amber-950 to-zinc-950", accent: "text-amber-300", dot: "bg-amber-400" },
  Music:        { gradient: "from-fuchsia-950 via-pink-950 to-zinc-950", accent: "text-fuchsia-400", dot: "bg-fuchsia-500" },
  Sport:        { gradient: "from-green-950 via-emerald-950 to-zinc-950", accent: "text-green-400", dot: "bg-green-500" },
  Western:      { gradient: "from-orange-950 via-amber-950 to-stone-950", accent: "text-orange-300", dot: "bg-orange-400" },
};

const DEFAULT_THEME = {
  gradient: "from-rose-950 via-zinc-950 to-zinc-950",
  accent: "text-rose-400",
  dot: "bg-rose-500",
};

function getTheme(items = []) {
  // Use the genre of the first item in the list
  const genre = items[0]?.genre ?? items[0]?.videoId;
  return GENRE_THEMES[genre] || DEFAULT_THEME;
}

function SectionBanner({ title, subtitle, items, theme }) {
  const featured = items[0];
  if (!featured) return null;

  const featuredTitle = featured.title ?? featured.videoId;
  const featuredThumb = featured.thumbnailUrl;
  const featuredGenre = featured.genre;
  const featuredYear  = featured.year;
  const featuredRating = featured.rating;

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r ${theme.gradient} mx-4 sm:mx-6 lg:mx-10`}
    >
      {/* Noise overlay for texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative flex items-center gap-6 px-6 py-5 sm:gap-8">
        {/* Thumbnail */}
        {featuredThumb ? (
          <div className="relative hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-xl sm:block">
            <img src={featuredThumb} alt={featuredTitle} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
          </div>
        ) : (
          <div className={`hidden h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/20 sm:flex`}>
            <svg className="h-8 w-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest ${theme.accent}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              {title}
            </span>
            {items.length > 1 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-500">
                {items.length} titles
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{featuredTitle}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {featuredGenre && <span className={`font-medium ${theme.accent}`}>{featuredGenre}</span>}
            {featuredYear && <span>{featuredYear}</span>}
            {featuredRating && (
              <span className="rounded border border-white/10 px-1.5 py-0.5">{featuredRating}</span>
            )}
            {subtitle && <span className="text-zinc-500">• {subtitle}</span>}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.02] blur-xl" />
        <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full bg-white/[0.02] blur-lg" />
      </div>
    </div>
  );
}

export default function ContentRow({ title, subtitle, items, variant = "video" }) {
  if (!items?.length) return null;
  const theme = getTheme(items);

  return (
    <section className="mb-12">
      {/* Banner header */}
      <SectionBanner title={title} subtitle={subtitle} items={items} theme={theme} />

      {/* Scrollable cards */}
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {items.map((item) => (
          <MovieCard
            key={item._id ?? item.videoId}
            video={variant === "video" ? item : undefined}
            recommendation={variant === "recommendation" ? item : undefined}
          />
        ))}
      </div>
    </section>
  );
}
