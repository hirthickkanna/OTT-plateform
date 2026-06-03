import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import VideoPlayer from "../components/VideoPlayer";

export default function Live() {
  const [channels, setChannels] = useState([]);
  const [title, setTitle] = useState("");
  const [activeChannel, setActiveChannel] = useState(null);
  const { isAuthenticated } = useAuth();

  const load = () => api("/api/live").then(setChannels).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const createChannel = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    await api("/api/live", { method: "POST", body: JSON.stringify({ title }) });
    setTitle("");
    load();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight text-white">Live streaming</h1>
      <p className="mt-2 text-zinc-500">Watch and create live channels in real time.</p>

      {isAuthenticated && (
        <form onSubmit={createChannel} className="mt-8 flex gap-3">
          <input
            placeholder="Channel title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-zinc-900/60 px-4 py-3 text-white outline-none focus:border-rose-500/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Create channel
          </button>
        </form>
      )}

      {activeChannel && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/5 bg-black shadow-2xl">
          <div className="flex items-center justify-between bg-zinc-900/80 px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-semibold text-white">Live: {activeChannel.title}</span>
            </div>
            <button
              onClick={() => setActiveChannel(null)}
              className="text-sm font-medium text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Close Player ✕
            </button>
          </div>
          <VideoPlayer src={activeChannel.hlsUrl} />
        </div>
      )}

      <ul className="mt-8 divide-y divide-white/5 rounded-2xl border border-white/5 bg-zinc-900/40">
        {channels.length === 0 ? (
          <li className="px-6 py-12 text-center text-zinc-500">No live channels yet.</li>
        ) : (
          channels.map((c) => (
            <li key={c._id} className="flex items-center justify-between px-6 py-4">
              <strong className="text-white">{c.title}</strong>
              {c.hlsUrl && (
                <button
                  onClick={() => setActiveChannel(c)}
                  className="text-sm font-medium text-rose-400 transition hover:text-rose-300 cursor-pointer"
                >
                  Watch Live →
                </button>
              )}
            </li>
          ))
        )}
      </ul>

      <p className="mt-8">
        <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
