import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  const [similar, setSimilar] = useState([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setVideo(null);
    setSimilar([]);
    api(`/api/videos/${id}`).then(setVideo).catch(console.error);
    api(`/api/streaming/playback/${id}`)
      .then(setPlayback)
      .catch((e) => console.warn(e.message));
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
        <Link to="/" className="inline-flex text-sm text-zinc-500 transition hover:text-white">
          ← Back to movies
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-black shadow-2xl">
          {playback?.hlsUrl ? (
            <VideoPlayer src={playback.hlsUrl} onProgress={onProgress} />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-zinc-900 text-zinc-500">
              Playback unavailable — video may still be processing.
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{video.title}</h1>

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
