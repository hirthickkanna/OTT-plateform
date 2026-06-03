import { Link } from "react-router-dom";
import { normalizeUrl } from "../api/client";

function Poster({ title, thumbnailUrl }) {
  if (thumbnailUrl) {
    return (
      <img
        src={normalizeUrl(thumbnailUrl)}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
    );
  }


  const initial = (title || "?").charAt(0).toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-rose-950/40 to-zinc-900">
      <span className="text-4xl font-bold text-white/20">{initial}</span>
    </div>
  );
}

export default function MovieCard({ video, recommendation }) {
  const id = video?._id ?? recommendation?.videoId;
  const title = video?.title ?? recommendation?.title;
  const thumbnailUrl = video?.thumbnailUrl ?? recommendation?.thumbnailUrl;
  const views = video?.viewCount;
  const reason = recommendation?.reason;

  return (
    <Link
      to={`/watch/${id}`}
      className="group relative flex w-[160px] shrink-0 flex-col sm:w-[180px] md:w-[200px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-rose-500/30 group-hover:shadow-rose-950/30 group-hover:ring-rose-500/20">
        <Poster title={title} thumbnailUrl={thumbnailUrl} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 flex translate-y-2 items-center justify-center gap-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium text-zinc-100 transition-colors group-hover:text-rose-200">
          {title}
        </h3>
        {reason && (
          <p className="mt-0.5 line-clamp-1 text-xs text-rose-400/80">{reason}</p>
        )}
        {views != null && !reason && (
          <p className="mt-0.5 text-xs text-zinc-500">{views.toLocaleString()} views</p>
        )}
      </div>
    </Link>
  );
}
