import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import VideoPlayer from "../components/VideoPlayer";

export default function Live() {
  const [channels, setChannels] = useState([]);
  const [title, setTitle] = useState("");
  const [youtubeStreamKey, setYoutubeStreamKey] = useState("");
  const [activeChannel, setActiveChannel] = useState(null);
  const [createdChannel, setCreatedChannel] = useState(null);
  const { isAuthenticated, user } = useAuth();

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
    try {
      const channel = await api("/api/live", {
        method: "POST",
        body: JSON.stringify({ title, youtubeStreamKey }),
      });
      setCreatedChannel(channel);
      setTitle("");
      setYoutubeStreamKey("");
      load();
    } catch (err) {
      console.error("Error creating channel:", err);
    }
  };

  const deleteChannel = async (id) => {
    if (!window.confirm("Are you sure you want to delete this live channel?")) return;
    try {
      await api(`/api/live/${id}`, { method: "DELETE" });
      if (activeChannel && activeChannel._id === id) {
        setActiveChannel(null);
      }
      if (createdChannel && createdChannel._id === id) {
        setCreatedChannel(null);
      }
      load();
    } catch (err) {
      console.error("Error deleting channel:", err);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight text-white">Live streaming</h1>
      <p className="mt-2 text-zinc-500">Watch and create live channels in real time.</p>

      {isAuthenticated && (
        <form onSubmit={createChannel} className="mt-8 rounded-2xl border border-white/5 bg-zinc-900/20 p-6 space-y-4 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Start a New Channel</h2>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Channel Title</label>
            <input
              placeholder="e.g. My Live Event"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-4 py-3 text-white outline-none focus:border-rose-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">YouTube Stream Key (Optional)</label>
            <input
              placeholder="Paste YouTube Stream Key for Multistreaming"
              value={youtubeStreamKey}
              onChange={(e) => setYoutubeStreamKey(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-4 py-3 text-white outline-none focus:border-rose-500/50 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500 font-normal">
              Leave empty if you only want to stream directly on our platform.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 cursor-pointer"
          >
            Create channel
          </button>
        </form>
      )}

      {createdChannel && (
        <div className="mt-8 rounded-2xl border border-rose-500/20 bg-rose-950/20 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <h3 className="text-lg font-semibold text-rose-400">Stream Setup Credentials</h3>
            <button
              onClick={() => setCreatedChannel(null)}
              className="text-zinc-400 hover:text-white transition cursor-pointer text-sm font-semibold"
            >
              Dismiss
            </button>
          </div>
          
          <p className="mt-3 text-sm text-zinc-300 font-normal">
            Use the settings below in your broadcasting software (like OBS Studio) to start your live stream:
          </p>
          
          <div className="mt-4 space-y-4">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Server URL (RTMP Ingestion)</span>
              <div className="mt-1 flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 border border-white/5 font-mono text-sm">
                <span className="truncate mr-2 select-all text-zinc-300">{createdChannel.ingestUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdChannel.ingestUrl);
                    alert("RTMP server URL copied to clipboard!");
                  }}
                  className="rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 px-2 py-1 text-xs transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Stream Key</span>
              <div className="mt-1 flex items-center justify-between rounded-lg bg-black/40 px-3 py-2 border border-white/5 font-mono text-sm">
                <span className="truncate mr-2 select-all text-zinc-300">{createdChannel.streamKey}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdChannel.streamKey);
                    alert("Stream key copied to clipboard!");
                  }}
                  className="rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 px-2 py-1 text-xs transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            {createdChannel.youtubeStreamKey && (
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">YouTube Multistreaming</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-rose-950/40 px-3 py-2 border border-rose-500/20 text-rose-300 text-sm">
                  <span>Enabled (Relaying to: {createdChannel.youtubeStreamKey.slice(0, 4)}••••{createdChannel.youtubeStreamKey.slice(-4)})</span>
                </div>
              </div>
            )}
          </div>
        </div>
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
              <div className="flex items-center gap-4">
                {c.hlsUrl && (
                  <button
                    onClick={() => setActiveChannel(c)}
                    className="text-sm font-medium text-rose-400 transition hover:text-rose-300 cursor-pointer animate-pulse"
                  >
                    Watch Live →
                  </button>
                )}
                {isAuthenticated && (c.creatorId === user?.id || c.creatorId === user?._id) && (
                  <button
                    onClick={() => deleteChannel(c._id)}
                    className="text-xs font-semibold text-zinc-500 hover:text-rose-500 transition cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
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
