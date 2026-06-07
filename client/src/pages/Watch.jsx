import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ContentRow from "../components/ContentRow";
import VideoPlayer from "../components/VideoPlayer";
import { useAuth } from "../context/AuthContext";

function formatDuration(sec) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function Watch() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [playback, setPlayback] = useState(null);
  const [playbackError, setPlaybackError] = useState("");
  const [similar, setSimilar] = useState([]);
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

  const downloaded = isDownloaded(id);
  const downloading = isDownloading(id);
  const progress = downloadProgress[id] || 0;

  const isPlayable = !isOffline || downloaded;

  useEffect(() => {
    setVideo(null);
    setSimilar([]);
    setPlaybackError("");
    api(`/api/videos/${id}`).then(setVideo).catch(console.error);
    api(`/api/streaming/playback/${id}`)
      .then((data) => {
        setPlayback(data);
        setPlaybackError("");
      })
      .catch((e) => {
        console.warn(e.message);
        setPlaybackError(e.message || "Failed to load playback.");
      });
    api(`/api/recommendations/similar/${id}`)
      .then(setSimilar)
      .catch(console.error);
  }, [id]);

  const onProgress = useCallback(
    (progressSec, completed) => {
      if (!isAuthenticated) return;
      api("/api/analytics/progress", {
        method: "POST",
        body: JSON.stringify({ videoId: id, progressSec, completed }),
      }).catch(() => {});
    },
    [id, isAuthenticated],
  );

  if (!video) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </main>
    );
  }

  const duration = formatDuration(video.durationSec);
  const languages = video.languages?.length ? video.languages : ["English"];

  return (
    <div className="pb-16">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex text-sm text-zinc-500 transition hover:text-white">
            ← Back to movies
          </Link>
          
          {isOffline && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              Offline Playback Mode Active
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-black shadow-2xl">
          {!isPlayable ? (
            <div className="flex aspect-video flex-col items-center justify-center bg-zinc-900 border border-white/5 p-6 text-center text-zinc-400 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-md">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white">Offline Playback Unavailable</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  This movie is not downloaded on this device. Switch back to online mode in the navigation bar to stream.
                </p>
              </div>
            </div>
          ) : playback?.hlsUrl ? (
            <VideoPlayer src={playback.hlsUrl} onProgress={onProgress} />
          ) : playbackError ? (
            <div className="flex aspect-video flex-col items-center justify-center bg-zinc-900 border border-white/5 p-6 text-center text-zinc-400 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-md">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white">Active Subscription Required</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  {playbackError.includes("subscription") 
                    ? "An active subscription plan is required to watch this video." 
                    : playbackError}
                </p>
                <Link to="/subscribe" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                  View Subscription Plans
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-zinc-900 text-zinc-500">
              Playback unavailable — video may still be processing.
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{video.title}</h1>
              
              {!isOffline && (
                <button
                  type="button"
                  onClick={() => {
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
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-300 shadow-lg shrink-0 ${
                    downloaded
                      ? "bg-zinc-800 border border-emerald-500/30 text-emerald-400 hover:bg-zinc-700"
                      : downloading
                      ? "bg-rose-600/20 text-rose-300 border border-rose-500/30 cursor-wait"
                      : "bg-rose-600 hover:bg-rose-500 text-white"
                  }`}
                >
                  {downloading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Downloading {progress}%
                    </>
                  ) : downloaded ? (
                    <>
                      <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Downloaded (Remove)
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Movie
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {video.year && (
                <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-zinc-300">{video.year}</span>
              )}
              {video.genre && (
                <span className="rounded-md bg-rose-950/60 px-2.5 py-1 text-rose-300">{video.genre}</span>
              )}
              {video.rating && (
                <span className="rounded-md border border-white/10 px-2.5 py-1 text-zinc-400">
                  {video.rating}
                </span>
              )}
              {duration && <span className="text-zinc-500">{duration}</span>}
              {video.viewCount != null && (
                <span className="text-zinc-500">{video.viewCount.toLocaleString()} views</span>
              )}
            </div>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                About this movie
              </h2>
              <p className="mt-3 leading-relaxed text-zinc-300">
                {video.description ||
                  "No description available yet. Check back soon for more details about this title."}
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Available languages
              </h2>
              <p className="mt-1 text-sm text-zinc-600">Audio and subtitles</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-white"
                  >
                    <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    {lang}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-2xl border border-white/5 bg-zinc-900/50 p-5 lg:sticky lg:top-24 lg:self-start">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {video.genre && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Genre</dt>
                  <dd className="text-right font-medium text-white">{video.genre}</dd>
                </div>
              )}
              {video.year && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Release</dt>
                  <dd className="text-right font-medium text-white">{video.year}</dd>
                </div>
              )}
              {duration && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Runtime</dt>
                  <dd className="text-right font-medium text-white">{duration}</dd>
                </div>
              )}
              {video.rating && (
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Rating</dt>
                  <dd className="text-right font-medium text-white">{video.rating}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Languages</dt>
                <dd className="text-right font-medium text-white">{languages.join(", ")}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>

      {similar.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-10">
          <ContentRow
            title="More movies you may like"
            subtitle="Recommended based on this title"
            items={similar}
            variant="recommendation"
          />
        </div>
      )}
    </div>
  );
}
