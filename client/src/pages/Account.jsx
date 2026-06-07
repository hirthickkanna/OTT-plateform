import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-zinc-800/60 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400";

function InfoBadge({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-800/30 px-4 py-3.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700/60 text-zinc-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">{value || <span className="text-zinc-600 italic">Not set</span>}</p>
      </div>
    </div>
  );
}

export default function Account() {
  const { isAuthenticated, user: authUser, logout, downloads, removeDownload } = useAuth();
  const [searchParams] = useSearchParams();
  const justSubscribed = searchParams.get("subscribed") === "1";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  const load = async () => {
    try {
      const data = await api("/api/auth/me");
      setProfile(data);
      setForm({
        displayName: data.user.displayName || "",
        phone: data.user.phone || "",
      });
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

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr("");
    setSaveMsg("");
    setSaving(true);
    try {
      const res = await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setProfile((p) => ({ ...p, user: res.user }));
      setForm({
        displayName: res.user.displayName || "",
        phone: res.user.phone || "",
      });
      // Sync localStorage so Navbar and AuthContext stay up-to-date
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...stored,
          displayName: res.user.displayName,
          phone: res.user.phone,
        }),
      );
      setSaveMsg("Profile updated successfully!");
      setEditing(false);
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sub = profile?.subscription;
  const planName = sub?.planId?.name || "No active plan";
  const planPrice = sub?.planId?.priceCents != null
    ? `₹${sub.planId.priceCents % 100 === 0 ? (sub.planId.priceCents / 100).toFixed(0) : (sub.planId.priceCents / 100).toFixed(2)}/${sub.planId.interval || "month"}`
    : null;
  const planExpiry = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const daysRemaining = sub?.currentPeriodEnd
    ? Math.ceil((new Date(sub.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const initials = ((profile?.user?.displayName || authUser?.email || "U")[0]).toUpperCase();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">My Account</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Account Center</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your profile, subscription, and preferences.</p>
      </div>

      {/* Success toast */}
      {justSubscribed && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-400">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          🎉 Subscription activated! Enjoy your plan.
        </div>
      )}
      {saveMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-400">
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {saveMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Left: Profile card ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar + name */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-6 text-center backdrop-blur-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-800 text-3xl font-bold text-white shadow-lg shadow-rose-900/40">
                {initials}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                {profile?.user?.displayName || "User"}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">{profile?.user?.email}</p>
              <span className="mt-2 inline-block rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-xs capitalize text-zinc-400">
                {profile?.user?.role || "viewer"}
              </span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 text-center">
                <p className="text-2xl font-bold text-white">{profile?.watchCount ?? 0}</p>
                <p className="mt-1 text-xs text-zinc-500">Watched</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 text-center">
                <p className="text-2xl font-bold text-white">{sub ? "✓" : "✗"}</p>
                <p className="mt-1 text-xs text-zinc-500">Active Plan</p>
              </div>
            </div>
          </div>

          {/* ── Right: Details ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Profile info / Edit form */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Profile Information</h3>
                <button
                  onClick={() => { setEditing((v) => !v); setSaveErr(""); setSaveMsg(""); }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>

              {editing ? (
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  {saveErr && (
                    <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">⚠ {saveErr}</p>
                  )}
                  <div>
                    <label className={labelCls}>Display Name</label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => set("displayName", e.target.value)}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input
                      type="email"
                      value={profile?.user?.email || ""}
                      readOnly
                      disabled
                      className={inputCls}
                    />
                    <p className="mt-1 text-xs text-zinc-600">Email cannot be changed here.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Mobile Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                    >
                      {saving ? (
                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</>
                      ) : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBadge
                    label="Display Name"
                    value={profile?.user?.displayName}
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  />
                  <InfoBadge
                    label="Email Address"
                    value={profile?.user?.email}
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  />
                  <InfoBadge
                    label="Mobile Number"
                    value={profile?.user?.phone}
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                  />
                  <InfoBadge
                    label="Account Role"
                    value={profile?.user?.role}
                    icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                  />
                </div>
              )}
            </div>

            {/* Subscription info */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Subscription Plan</h3>
                <Link
                  to="/subscribe"
                  className="rounded-lg border border-rose-500/20 bg-rose-600/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-600/20"
                >
                  {sub ? "Change Plan" : "Choose a Plan"}
                </Link>
              </div>

              {sub ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                      <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{planName}</p>
                      {planPrice && <p className="text-sm text-zinc-400">{planPrice}</p>}
                    </div>
                    <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">Active</span>
                  </div>
                  {planExpiry && (
                    <p className="text-xs text-zinc-500 text-center">Expires on {planExpiry} (No auto-renewal)</p>
                  )}
                  {daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0 && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-600/10 p-4 text-amber-400">
                      <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">Your plan is expiring soon!</p>
                        <p className="mt-1 text-xs text-zinc-400 leading-normal">
                          Only {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left of your subscription. Choose a plan to renew and keep streaming.
                        </p>
                      </div>
                    </div>
                  )}
                  {sub.planId?.features?.length > 0 && (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {sub.planId.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                          <svg className="h-3.5 w-3.5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
                    <svg className="h-7 w-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-400">No active subscription.</p>
                  <Link
                    to="/subscribe"
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
                  >
                    Browse Plans
                  </Link>
                </div>
              )}
            </div>

            {/* Offline Downloads */}
            <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-base font-semibold text-white">Offline Downloads</h3>
              
              {downloads?.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {downloads.map((movie) => {
                    const posterUrl = movie.thumbnailUrl;
                    const initials = movie.title.charAt(0).toUpperCase();
                    return (
                      <div key={movie._id} className="group relative flex flex-col rounded-xl border border-white/5 bg-zinc-800/20 overflow-hidden hover:border-rose-500/20 transition-all duration-300">
                        <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                          {posterUrl ? (
                            <img src={posterUrl} alt={movie.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-2xl font-bold text-white/10">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-rose-300 transition-colors">
                              {movie.title}
                            </h4>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {movie.genre || "Movie"} &middot; {movie.year || "N/A"}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Link
                              to={`/watch/${movie._id}`}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
                            >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              Watch
                            </Link>
                            <button
                              onClick={() => removeDownload(movie._id)}
                              title="Delete Download"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-zinc-500">
                  <svg className="h-8 w-8 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <p className="text-xs">No downloads found in your account.</p>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-rose-500/10 bg-rose-950/10 p-6">
              <h3 className="mb-1 text-base font-semibold text-white">Sign Out</h3>
              <p className="mb-4 text-sm text-zinc-500">Sign out of your StreamVault account on this device.</p>
              <button
                onClick={logout}
                className="rounded-xl border border-rose-500/30 bg-rose-600/10 px-5 py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-600/20 hover:text-rose-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-10">
        <Link to="/" className="text-sm text-zinc-600 transition hover:text-zinc-400">← Back to home</Link>
      </p>
    </main>
  );
}
