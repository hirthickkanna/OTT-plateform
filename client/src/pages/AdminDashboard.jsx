import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AdminDashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | approved | all

  const loadVideos = () => {
    setLoading(true);
    api("/api/admin/videos")
      .then(setVideos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const approve = async (id) => {
    try {
      await api(`/api/admin/videos/${id}/approve`, { method: "PATCH" });
      loadVideos();
    } catch (err) {
      alert(err.message);
    }
  };

  const reject = async (id) => {
    try {
      await api(`/api/admin/videos/${id}/reject`, { method: "PATCH" });
      loadVideos();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredVideos = videos.filter((v) => {
    if (filter === "pending") return v.isApproved === false;
    if (filter === "approved") return v.isApproved === true;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10 min-h-[calc(100vh-73px)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">Moderate and approve uploaded videos for public viewing.</p>
        </div>
        
        <div className="flex rounded-lg bg-zinc-900/60 p-1 border border-white/5 self-start sm:self-auto">
          {["pending", "approved", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                filter === f
                  ? "bg-rose-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {f === "pending" ? "Pending Approval" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md">
          {filteredVideos.length === 0 ? (
            <div className="px-6 py-16 text-center text-zinc-500">
              No videos found matching this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-white/5 bg-zinc-950/40 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4">Video Info</th>
                    <th className="px-6 py-4">Uploader</th>
                    <th className="px-6 py-4">Transcode Status</th>
                    <th className="px-6 py-4">Approval State</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredVideos.map((v) => (
                    <tr key={v._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.thumbnailUrl || "/posters/placeholder.png"}
                            alt=""
                            className="h-12 w-20 rounded bg-zinc-800 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-[220px]" title={v.title}>
                              {v.title}
                            </p>
                            <p className="text-xs text-zinc-500 truncate max-w-[220px]">
                              {v.genre || "No genre"} • {v.year || "No year"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        <p className="font-medium text-zinc-300 truncate max-w-[180px]">
                          {v.creatorId?.displayName || "Unknown Creator"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate max-w-[180px]">{v.creatorId?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          v.status === "ready"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : v.status === "transcoding"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : v.status === "failed"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            v.status === "ready"
                              ? "bg-emerald-500"
                              : v.status === "transcoding"
                              ? "bg-blue-500"
                              : v.status === "failed"
                              ? "bg-rose-500"
                              : "bg-zinc-500"
                          }`} />
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {v.isApproved ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                            <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!v.isApproved ? (
                            <button
                              onClick={() => approve(v._id)}
                              disabled={v.status !== "ready"}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                              title={v.status !== "ready" ? "Transcoding must finish before approval" : ""}
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => reject(v._id)}
                              className="rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-400 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
