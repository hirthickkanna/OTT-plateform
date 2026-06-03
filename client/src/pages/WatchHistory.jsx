import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function WatchHistory() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api("/api/analytics/summary").then(setSummary).catch(console.error);
    api("/api/analytics/history").then(setHistory).catch(console.error);
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight text-white">Watch history</h1>
      {summary && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-6">
            <strong className="block text-3xl font-bold text-rose-400">{summary.totalWatched}</strong>
            <span className="text-sm text-zinc-500">Titles watched</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-6">
            <strong className="block text-3xl font-bold text-rose-400">
              {Math.round(summary.completionRate * 100)}%
            </strong>
            <span className="text-sm text-zinc-500">Completion rate</span>
          </div>
        </div>
      )}
      <ul className="mt-8 divide-y divide-white/5 rounded-2xl border border-white/5 bg-zinc-900/40">
        {history.length === 0 ? (
          <li className="px-6 py-12 text-center text-zinc-500">No watch history yet.</li>
        ) : (
          history.map((h) => (
            <li key={h._id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
              <Link
                to={`/watch/${h.videoId?._id || h.videoId}`}
                className="font-medium text-white transition hover:text-rose-300"
              >
                {h.videoId?.title || "Unknown"}
              </Link>
              <span className="text-sm text-zinc-500">
                {Math.floor(h.progressSec / 60)} min
                {h.completed ? " · Completed" : ""}
              </span>
            </li>
          ))
        )}
      </ul>
      <p className="mt-8">
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to movies
        </Link>
      </p>
    </main>
  );
}
