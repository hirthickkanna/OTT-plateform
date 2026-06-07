import { Link, useNavigate } from "react-router-dom";
import { normalizeUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

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
  const {
    isAuthenticated,
    subscription,
    isOffline,
    isDownloaded,
    isDownloading,
    downloadProgress,
    downloadMovie,
    removeDownload,
  } = useAuth();
  
  const navigate = useNavigate();

  const id = video?._id ?? recommendation?.videoId;
  const title = video?.title ?? recommendation?.title;
  const thumbnailUrl = video?.thumbnailUrl ?? recommendation?.thumbnailUrl;
  const views = video?.viewCount;
  const reason = recommendation?.reason;

  const downloaded = isDownloaded(id);
  const downloading = isDownloading(id);
  const progress = downloadProgress[id] || 0;

  const isPlayable = !isOffline || downloaded;

  return (
    <div className={`relative flex w-[160px] shrink-0 flex-col sm:w-[180px] md:w-[200px] ${!isPlayable ? "opacity-45 grayscale select-none" : ""}`}>
      <Link
        to={isPlayable ? `/watch/${id}` : "#"}
        onClick={(e) => {
          if (!isPlayable) {
            e.preventDefault();
          }
        }}
        className="group relative"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-rose-500/30 group-hover:shadow-rose-950/30 group-hover:ring-rose-500/20">
          <Poster title={title} thumbnailUrl={thumbnailUrl} />
          
          {/* Top-Right Download Status Badge (Always visible if active) */}
          {isAuthenticated && (downloaded || downloading) && (
            <div className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-md">
              {downloading ? (
                <div className="relative flex items-center justify-center h-full w-full">
                  <svg className="h-5 w-5 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="absolute text-[7px] font-extrabold text-rose-200">{progress}%</span>
                </div>
              ) : (
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )}

          {/* Locked Badge (Offline and not downloaded) */}
          {isOffline && !downloaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] gap-1">
              <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Offline</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          {/* Action overlay buttons */}
          <div className="absolute bottom-0 left-0 right-0 flex translate-y-2 items-center justify-center gap-3 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {isPlayable && (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg transition-transform hover:scale-105">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            )}
            
            {!isOffline && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isAuthenticated) {
                    navigate("/login?reason=download");
                    return;
                  }
                  if (!subscription) {
                    navigate("/subscribe");
                    return;
                  }
                  if (downloaded) {
                    removeDownload(id);
                  } else if (!downloading) {
                    downloadMovie(id);
                  }
                }}
                title={downloaded ? "Remove Download" : "Download Movie"}
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 ${
                  downloaded
                    ? "bg-zinc-800 border border-emerald-500/30 text-emerald-400 hover:bg-zinc-700"
                    : "bg-zinc-800 border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
                }`}
              >
                {downloading ? (
                  <svg className="h-4 w-4 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : downloaded ? (
                  <svg className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </Link>
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
    </div>
  );
}

