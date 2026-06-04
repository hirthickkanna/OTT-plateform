import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, normalizeUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

// ── Constants ────────────────────────────────────────────────────────────────
const GENRES = ["Action","Comedy","Drama","Horror","Sci-Fi","Thriller","Romance","Documentary","Animation","Fantasy","Mystery","Adventure","Biography","Crime","History","Music","Sport","Western"];
const RATINGS = ["U", "UA 7+", "UA 13+", "UA 16+", "A"];

const STATUS_STYLE = {
  ready:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  transcoding: "bg-amber-500/15  text-amber-400  border-amber-500/25",
  uploading:   "bg-blue-500/15   text-blue-400   border-blue-500/25",
  failed:      "bg-rose-500/15   text-rose-400   border-rose-500/25",
};
const STATUS_DOT = {
  ready:       "bg-emerald-400",
  transcoding: "bg-amber-400 animate-pulse",
  uploading:   "bg-blue-400 animate-pulse",
  failed:      "bg-rose-400",
};

const EMPTY_FORM = {
  title: "", description: "", genre: "", year: new Date().getFullYear(),
  rating: "", languages: "", drmEnabled: false,
};

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ── Shared field styles ───────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl border border-white/10 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400";

// ── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl ${accent}/10`}>
        <span className={accent}>{icon}</span>
      </div>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function UploadZone({ videoId, onDone }) {
  const fileRef = useRef(null);
  const xhrRef  = useRef(null);
  const [state, setState] = useState("idle"); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const [dragging, setDragging] = useState(false);

  const doUpload = (file) => {
    if (!file) return;
    const ACCEPTED = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-matroska",
      "video/mkv",
      "application/x-matroska",
      "video/avi",
      "video/x-msvideo",
      "application/octet-stream"
    ];
    const ext = file.name.split(".").pop().toLowerCase();
    const ALLOWED_EXTS = ["mp4", "webm", "ogg", "mov", "mkv", "avi"];

    const isValidType = ACCEPTED.includes(file.type) || file.type === "";
    const isValidExt = ALLOWED_EXTS.includes(ext);

    if (!isValidType && !isValidExt) {
      setErrMsg(`Unsupported format: ${file.type || "unknown"}. Use MP4, WebM, MOV, MKV or AVI.`);
      setState("error");
      return;
    }
    setFileName(file.name);
    setFileSize(file.size);
    setState("uploading");
    setProgress(0);
    setErrMsg("");

    const token = localStorage.getItem("token");
    const form  = new FormData();
    form.append("video", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setState("done");
        setProgress(100);
        onDone();
      } else {
        let msg = `Server error ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch {}
        setErrMsg(msg);
        setState("error");
      }
    });

    xhr.addEventListener("error", () => {
      setErrMsg("Network error — check your connection.");
      setState("error");
    });

    xhr.addEventListener("abort", () => {
      setState("idle");
      setProgress(0);
    });

    xhr.open("POST", `/api/upload/${videoId}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(form);
  };

  const cancel = () => { xhrRef.current?.abort(); };
  const onFilePick = (e) => doUpload(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    doUpload(e.dataTransfer.files?.[0]);
  };

  if (state === "done") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Upload complete! Video is now <strong className="ml-1">ready</strong> — it will appear in the movie list.
      </div>
    );
  }

  if (state === "uploading") {
    return (
      <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="truncate text-zinc-300 font-medium">{fileName}</span>
          <span className="ml-3 flex-shrink-0 text-zinc-500">{fmt(fileSize)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{progress}% uploaded</span>
          <button onClick={cancel} className="text-xs text-zinc-500 hover:text-rose-400 transition">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {state === "error" && (
        <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          ⚠ {errMsg}
        </p>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 transition-all ${
          dragging
            ? "border-rose-500/60 bg-rose-500/5 scale-[1.01]"
            : "border-white/10 hover:border-rose-500/30 hover:bg-rose-500/[0.02]"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border border-white/5">
          <svg className="h-7 w-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-200">
            Drag & drop your video here
          </p>
          <p className="mt-1 text-xs text-zinc-500">or click to browse files from your computer</p>
          <p className="mt-0.5 text-xs text-zinc-600">MP4, WebM, MOV, MKV, AVI — up to 5 GB</p>
        </div>
        <span className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20">
          Choose File from Computer
        </span>
      </div>
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,.mkv,.avi,video/*" className="hidden" onChange={onFilePick} />
    </div>
  );
}

// ── PosterUploadZone ─────────────────────────────────────────────────────────
function PosterUploadZone({ videoId, currentPoster, onDone }) {
  const fileRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | preview | uploading | done | error
  const [selectedFile, setSelectedFile] = useState(null); // File object
  const [preview, setPreview] = useState(null); // object URL for local preview
  const [fileName, setFileName] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const [newPosterUrl, setNewPosterUrl] = useState(null);

  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

  const pickFile = (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrMsg(`Unsupported format: ${file.type || "unknown"}. Use JPG, PNG, WebP or GIF.`);
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrMsg("Image too large. Maximum size is 10 MB.");
      setState("error");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setErrMsg("");
    // Show a local preview before uploading
    const url = URL.createObjectURL(file);
    setPreview(url);
    setState("preview");
  };

  const doUpload = () => {
    if (!selectedFile || state !== "preview") return;

    setState("uploading");
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("poster", selectedFile);

    fetch(`/api/upload/${videoId}/poster`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.message || `Error ${r.status}`);
        return data;
      })
      .then((data) => {
        setNewPosterUrl(data.thumbnailUrl);
        setState("done");
        onDone(data.thumbnailUrl);
      })
      .catch((e) => {
        setErrMsg(e.message);
        setState("error");
      });
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setFileName("");
    setErrMsg("");
    setState("idle");
    setNewPosterUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (state === "done" && newPosterUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[160px] overflow-hidden rounded-xl border-2 border-emerald-500/40 shadow-xl">
          <img src={normalizeUrl(newPosterUrl)} alt="New poster" className="aspect-[2/3] w-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 to-transparent pb-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Poster updated!
            </span>
          </div>
        </div>
        <button onClick={reset} className="text-xs text-zinc-500 hover:text-zinc-300 transition underline underline-offset-2">
          Upload a different poster
        </button>
      </div>
    );
  }

  // ── Preview state (local preview before upload) ────────────────────────────
  if (state === "preview" || state === "uploading") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[160px] overflow-hidden rounded-xl border border-white/10 shadow-xl">
          <img src={preview} alt="Preview" className="aspect-[2/3] w-full object-cover" />
          {state === "uploading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
              <svg className="h-8 w-8 animate-spin text-rose-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-white/80">Uploading…</span>
            </div>
          )}
        </div>
        <p className="max-w-[200px] truncate text-center text-xs text-zinc-400">{fileName}</p>
        <div className="flex gap-3">
          {state === "preview" && (
            <button
              onClick={doUpload}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Use this poster
            </button>
          )}
          <button
            onClick={reset}
            disabled={state === "uploading"}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Choose different
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / Error state ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Current poster preview */}
      {currentPoster && (
        <div className="flex-shrink-0">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Current</p>
          <div className="w-[80px] overflow-hidden rounded-lg border border-white/10">
            <img src={currentPoster} alt="Current poster" className="aspect-[2/3] w-full object-cover" />
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div className="flex-1">
        {state === "error" && (
          <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
            ⚠ {errMsg}
          </p>
        )}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
            dragging
              ? "border-violet-500/60 bg-violet-500/5 scale-[1.01]"
              : "border-white/10 hover:border-violet-500/30 hover:bg-violet-500/[0.02]"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 border border-white/5">
            <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Drag & drop a poster image</p>
            <p className="mt-0.5 text-xs text-zinc-500">or click to browse — JPG, PNG, WebP, GIF • max 10 MB</p>
          </div>
          <span className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20">
            Choose Image
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

function VideoRow({ video, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("video"); // "video" | "poster"
  const [deleting, setDeleting] = useState(false);
  const [currentThumb, setCurrentThumb] = useState(video.thumbnailUrl);

  const handleDelete = async () => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api(`/api/videos/${video._id}`, { method: "DELETE" });
      onDelete(video._id);
    } catch (e) {
      alert("Failed to delete: " + e.message);
      setDeleting(false);
    }
  };

  const duration = video.durationSec
    ? `${Math.floor(video.durationSec / 60)}m ${video.durationSec % 60}s`
    : null;

  const openTab = (tab) => {
    if (expanded && activeTab === tab) {
      setExpanded(false);
    } else {
      setActiveTab(tab);
      setExpanded(true);
    }
  };

  return (
    <li className="transition hover:bg-white/[0.015]">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        {/* Thumbnail — click to change poster */}
        <button
          onClick={() => openTab("poster")}
          title="Click to change poster"
          className="group relative flex h-16 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5 transition hover:ring-violet-500/40"
        >
          {currentThumb ? (
            <img src={normalizeUrl(currentThumb)} alt={video.title} className="h-full w-full object-cover" />
          ) : (
            <svg className="h-7 w-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          )}
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold text-white/80">Change</span>
          </div>
        </button>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-white">{video.title}</span>
            {video.genre && <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{video.genre}</span>}
            {video.drmEnabled && <span className="rounded-md border border-violet-500/20 bg-violet-900/40 px-2 py-0.5 text-xs text-violet-400">🔒 DRM</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {video.year && <span>{video.year}</span>}
            {video.rating && <span className="rounded border border-zinc-700 px-1">{video.rating}</span>}
            {duration && <span>{duration}</span>}
            <span>{(video.viewCount ?? 0).toLocaleString()} views</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[video.status] ?? STATUS_STYLE.uploading}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[video.status] ?? STATUS_DOT.uploading}`} />
            {video.status}
          </span>

          {/* Poster button — always visible */}
          <button
            onClick={() => openTab("poster")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              expanded && activeTab === "poster"
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-violet-500/20 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10"
            }`}
          >
            🖼 Poster
          </button>

          {/* Video upload for non-ready videos */}
          {video.status !== "ready" && (
            <button
              onClick={() => openTab("video")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                expanded && activeTab === "video"
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                  : "border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10"
              }`}
            >
              ⬆ Upload
            </button>
          )}

          {video.status === "ready" && (
            <Link
              to={`/watch/${video._id}`}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              ▶ Watch
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-40"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-white/5 bg-zinc-900/30 px-5 pb-6 pt-4">
          {/* Tab bar — only show video tab if not ready */}
          <div className="mb-5 flex w-fit items-center gap-1 rounded-xl border border-white/5 bg-zinc-800/40 p-1">
            {video.status !== "ready" && (
              <button
                onClick={() => setActiveTab("video")}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                  activeTab === "video"
                    ? "bg-blue-500/20 text-blue-300 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                ⬆ Upload Video
              </button>
            )}
            <button
              onClick={() => setActiveTab("poster")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                activeTab === "poster"
                  ? "bg-violet-500/20 text-violet-300 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🖼 Change Poster
            </button>
          </div>

          {/* Video upload tab */}
          {activeTab === "video" && video.status !== "ready" && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Video file for &quot;{video.title}&quot;
              </p>
              <UploadZone
                videoId={video._id}
                onDone={() => {
                  setExpanded(false);
                  onRefresh();
                }}
              />
            </div>
          )}

          {/* Poster upload tab */}
          {activeTab === "poster" && (
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Update poster image</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    This image will appear on the home page cards, content rows, and watch page.
                  </p>
                </div>
                {currentThumb && (
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="mb-1 text-xs text-zinc-600">Live preview</p>
                    <div className="w-[52px] overflow-hidden rounded-md border border-white/10 shadow-lg">
                      <img
                        src={currentThumb}
                        alt="Current poster"
                        className="aspect-[2/3] w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              <PosterUploadZone
                videoId={video._id}
                currentPoster={currentThumb}
                onDone={(newUrl) => setCurrentThumb(newUrl)}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const { isAuthenticated, user } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [createdVideo, setCreatedVideo] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const load = async () => {
    try {
      const res = await api("/api/creator/dashboard");
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login" />;

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const createVideo = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const created = await api("/api/videos", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          year: Number(form.year) || undefined,
          languages: form.languages
            ? form.languages.split(",").map((l) => l.trim()).filter(Boolean)
            : [],
        }),
      });
      setCreatedVideo(created);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setData((p) => ({
      ...p,
      videos: p.videos.filter((v) => v._id !== id),
      stats: { ...p.stats, totalVideos: p.stats.totalVideos - 1 },
    }));
    if (createdVideo?._id === id) setCreatedVideo(null);
  };

  const TABS = ["all","ready","transcoding","uploading","failed"];
  const count = (s) => (data?.videos ?? []).filter((v) => s === "all" || v.status === s).length;
  const filtered = (data?.videos ?? []).filter((v) => activeTab === "all" || v.status === activeTab);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Creator Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome, <span className="text-zinc-300">{user?.displayName || user?.email}</span>
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(""); setCreatedVideo(null); }}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          {showForm ? "Cancel" : "Upload New Video"}
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {loading ? (
          [0,1,2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900/60" />)
        ) : (
          <>
            <StatCard label="Total Videos" value={data?.stats?.totalVideos ?? 0}
              accent="text-rose-400"
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>}
            />
            <StatCard label="Total Views" value={(data?.stats?.totalViews ?? 0).toLocaleString()}
              accent="text-blue-400"
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9.764 0C6.34 8.585 9.018 6 12 6c2.982 0 5.66 2.585 6.764 6-1.104 3.415-3.782 6-6.764 6-2.982 0-5.66-2.585-6.764-6z" /></svg>}
            />
            <StatCard label="Revenue" value={`₹${((data?.stats?.revenueCents ?? 0) / 100).toFixed(2)}`}
              accent="text-emerald-400"
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </>
        )}
      </div>

      {/* ── Step 1: Metadata form ── */}
      {showForm && (
        <form onSubmit={createVideo} className="mt-8 rounded-2xl border border-white/8 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-400">1</span>
            <div>
              <h2 className="text-base font-semibold text-white">Video Metadata</h2>
              <p className="text-xs text-zinc-500">Fill in the details, then upload your video file in the next step.</p>
            </div>
          </div>

          {formError && (
            <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{formError}</div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Title — full width */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Enter video title"
                className={inputCls}
              />
            </div>

            {/* Description — full width */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Short synopsis or description…"
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Genre */}
            <div>
              <label className={labelCls}>Genre</label>
              <select value={form.genre} onChange={(e) => set("genre", e.target.value)} className={inputCls}>
                <option value="">Select genre</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className={labelCls}>Release Year</label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Rating */}
            <div>
              <label className={labelCls}>Content Rating</label>
              <select value={form.rating} onChange={(e) => set("rating", e.target.value)} className={inputCls}>
                <option value="">Select rating</option>
                {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Languages */}
            <div>
              <label className={labelCls}>Languages</label>
              <input
                value={form.languages}
                onChange={(e) => set("languages", e.target.value)}
                placeholder="English, Tamil, Hindi"
                className={inputCls}
              />
            </div>

            {/* DRM toggle */}
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-white/5 bg-zinc-800/30 p-4">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.drmEnabled}
                    onChange={(e) => set("drmEnabled", e.target.checked)}
                  />
                  <div className={`h-6 w-11 rounded-full transition-colors duration-200 ${form.drmEnabled ? "bg-rose-600" : "bg-zinc-700"}`} />
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${form.drmEnabled ? "left-[22px]" : "left-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Enable DRM Protection</p>
                  <p className="text-xs text-zinc-500">Encrypt with Widevine/FairPlay for content security</p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {submitting ? (
                <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</>
              ) : "Save & Continue →"}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Upload file ── */}
      {createdVideo && (
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400">2</span>
            <div>
              <h2 className="text-base font-semibold text-white">Upload Video File</h2>
              <p className="text-xs text-zinc-500">
                Now upload the actual video for <span className="font-medium text-zinc-300">"{createdVideo.title}"</span> from your computer.
              </p>
            </div>
          </div>
          <UploadZone
            videoId={createdVideo._id}
            onDone={() => {
              setCreatedVideo(null);
              load();
            }}
          />
          <p className="mt-4 text-center text-xs text-zinc-600">
            You can also upload later by clicking <strong className="text-zinc-500">⬆ Upload File</strong> on any video row below.
          </p>
        </div>
      )}

      {/* ── Video Library ── */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Your Library</h2>
          <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-zinc-900/60 p-1">
            {TABS.filter((t) => t === "all" || count(t) > 0).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  activeTab === tab ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
                {count(tab) > 0 && <span className="ml-1 text-zinc-600">({count(tab)})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40">
          {loading ? (
            <div className="space-y-px p-2">
              {[0,1,2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/50" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80">
                <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-300">No videos yet</p>
                <p className="mt-1 text-sm text-zinc-600">Click "Upload New Video" to get started.</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="mt-1 rounded-xl border border-rose-500/20 bg-rose-600/10 px-5 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-600/20"
              >
                Upload your first video
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filtered.map((v) => (
                <VideoRow key={v._id} video={v} onDelete={handleDelete} onRefresh={load} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Getting started steps ── */}
      {!loading && (data?.videos?.length ?? 0) === 0 && (
        <div className="mt-8 rounded-2xl border border-white/5 bg-zinc-900/30 p-6">
          <h3 className="font-semibold text-white">How it works</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { step:"1", title:"Add Metadata",  desc:"Enter title, genre, year, rating and DRM setting." },
              { step:"2", title:"Upload File",   desc:"Drop your video file from your computer — MP4, WebM, MOV, MKV or AVI up to 5 GB." },
              { step:"3", title:"Go Live",       desc:"Once uploaded, your video appears instantly in the StreamVault movie list for all viewers." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-sm font-bold text-rose-400">{step}</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-10">
        <Link to="/" className="text-sm text-zinc-600 transition hover:text-zinc-400">← Back to home</Link>
      </p>
    </main>
  );
}
