import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── Breakpoints used:
 *   Mobile  : < 768px  → hamburger + full-screen slide-in drawer
 *   Tablet  : 768–1023px → compact top bar, icons + short labels, no drawer
 *   Laptop+ : ≥ 1024px  → full expanded nav with labels & search bar
 * ────────────────────────────────────────────────────────────────────────── */

const desktopLinkClass = ({ isActive }) =>
  `relative text-sm font-medium transition-colors duration-200 pb-0.5 ${
    isActive
      ? "text-white after:absolute after:bottom-[-2px] after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-rose-500"
      : "text-zinc-400 hover:text-white"
  }`;

const tabletLinkClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
    isActive
      ? "text-white bg-white/8"
      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
  }`;

const drawerLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? "bg-rose-600/15 text-white border border-rose-500/25"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
  }`;

/* ── Reusable icon components ─────────────────────────────────────────────── */
const IcoHome = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IcoMovies = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);
const IcoLive = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76a6 6 0 010 8.49m-8.49-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
  </svg>
);
const IcoPlans = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);
const IcoHistory = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IcoCreator = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const IcoAdmin = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IcoAccount = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IcoSearch = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function Navbar() {
  const { isAuthenticated, user, logout, isOffline, toggleOffline } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const drawerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // Close drawer on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  // Close drawer on resize to tablet+
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate("/");
    }
    setMobileOpen(false);
    setSearchExpanded(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  const avatar = (user?.displayName || user?.email || "U")[0].toUpperCase();

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          TOP HEADER BAR (all screen sizes)
      ══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#08080d]/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-5 lg:px-8">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link to="/" className="flex shrink-0 items-center gap-2 group" onClick={closeMobile}>
            <img
              src="/logo.png"
              alt="StreamVault"
              className="h-8 w-8 rounded-xl object-cover shadow-md shadow-black/40 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="hidden text-base font-bold tracking-tight text-white sm:inline">
              Stream<span className="text-rose-500">Vault</span>
            </span>
          </Link>

          {/* ── Desktop Nav (≥ 1024px) ───────────────────────── */}
          <nav className="hidden items-center gap-1 lg:flex ml-4">
            <NavLink to="/" end className={desktopLinkClass} style={{ padding: "4px 10px" }}>Home</NavLink>
            <NavLink to="/#movies" className={desktopLinkClass} style={{ padding: "4px 10px" }}>Movies</NavLink>
            <NavLink to="/live" className={desktopLinkClass} style={{ padding: "4px 10px" }}>Live</NavLink>
            <NavLink to="/subscribe" className={desktopLinkClass} style={{ padding: "4px 10px" }}>Plans</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/history" className={desktopLinkClass} style={{ padding: "4px 10px" }}>History</NavLink>
                <NavLink to="/creator" className={desktopLinkClass} style={{ padding: "4px 10px" }}>Creator</NavLink>
                {user?.role === "admin" && (
                  <NavLink to="/admin" className={desktopLinkClass} style={{ padding: "4px 10px" }}>Admin</NavLink>
                )}
              </>
            )}
          </nav>

          {/* ── Tablet Nav (768–1023px) ──────────────────────── */}
          <nav className="hidden items-center gap-0.5 md:flex lg:hidden ml-3">
            {[
              { to: "/", label: "Home", Icon: IcoHome, end: true },
              { to: "/#movies", label: "Movies", Icon: IcoMovies },
              { to: "/live", label: "Live", Icon: IcoLive },
              { to: "/subscribe", label: "Plans", Icon: IcoPlans },
              ...(isAuthenticated ? [
                { to: "/history", label: "History", Icon: IcoHistory },
                { to: "/creator", label: "Creator", Icon: IcoCreator },
                ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", Icon: IcoAdmin }] : []),
              ] : []),
            ].map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={tabletLinkClass}>
                <Icon />
                <span className="text-[10px] leading-none">{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* ── Search — Desktop (≥ 1024px) ─────────────────── */}
          <form onSubmit={handleSearchSubmit} className="relative hidden items-center gap-2 lg:flex">
            <div className="relative">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 xl:w-64 rounded-lg bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-rose-500/50 text-zinc-200 pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all placeholder:text-zinc-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-500">
                <IcoSearch />
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-500 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* ── Search icon — Tablet (768–1023px) ───────────── */}
          <button
            type="button"
            aria-label="Search"
            onClick={() => { setSearchExpanded((v) => !v); }}
            className="hidden md:flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <IcoSearch />
          </button>

          {/* ── Offline badge — Laptop (≥ 1024px) ───────────── */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={toggleOffline}
              className={`hidden lg:flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 ${
                isOffline
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-950/20"
                  : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`} />
              </span>
              {isOffline ? "Offline" : "Online"}
            </button>
          )}

          {/* ── Auth — Desktop + Tablet ───────────────────────── */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Avatar with initials */}
                <Link
                  to="/account"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-xs font-bold text-white shadow-md transition hover:scale-105 hover:shadow-rose-500/20"
                  title={user?.displayName || user?.email}
                >
                  {avatar}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-rose-500/30 hover:bg-rose-600/10 hover:text-rose-400"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500 shadow-md shadow-rose-600/20"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* ── Hamburger — Mobile only (< 768px) ────────────── */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-xl border border-white/10 bg-zinc-900/60 transition hover:bg-white/5 md:hidden ml-1"
          >
            <span className={`block h-[2px] w-5 rounded-full bg-zinc-300 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block h-[2px] w-5 rounded-full bg-zinc-300 transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-[2px] w-5 rounded-full bg-zinc-300 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>

        {/* ── Tablet Expandable Search Bar ─────────────────────── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out hidden md:block lg:hidden ${
            searchExpanded ? "max-h-20 border-t border-white/5" : "max-h-0"
          }`}
        >
          <div className="px-5 py-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search movies, genres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900/80 border border-white/10 focus:border-rose-500/50 text-zinc-200 pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all placeholder:text-zinc-500"
                  autoFocus={searchExpanded}
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                  <IcoSearch />
                </span>
                {searchTerm && (
                  <button type="button" onClick={handleClearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button type="submit" className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition">
                Search
              </button>
              <button type="button" onClick={() => setSearchExpanded(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white transition">
                Cancel
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE DRAWER BACKDROP
      ══════════════════════════════════════════════════════════════ */}
      <div
        onClick={closeMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ══════════════════════════════════════════════════════════════
          MOBILE DRAWER (< 768px) — full slide-in panel
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 z-50 h-full w-[280px] max-w-[88vw] flex flex-col bg-[#0c0c14] border-r border-white/8 shadow-2xl shadow-black/60 transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
            <img src="/logo.png" alt="StreamVault" className="h-8 w-8 rounded-xl object-cover" />
            <span className="text-base font-bold tracking-tight text-white">
              Stream<span className="text-rose-500">Vault</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/8 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile search */}
        <div className="px-4 py-3 border-b border-white/5">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/80 border border-white/10 focus:border-rose-500/50 text-zinc-200 pl-9 pr-7 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all placeholder:text-zinc-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-zinc-500">
                <IcoSearch />
              </span>
              {searchTerm && (
                <button type="button" onClick={handleClearSearch} className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-500 hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition">Go</button>
          </form>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <p className="mb-2 px-3 pt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Browse</p>

          <NavLink to="/" end className={drawerLinkClass} onClick={closeMobile}><IcoHome />Home</NavLink>
          <NavLink to="/#movies" className={drawerLinkClass} onClick={closeMobile}><IcoMovies />Movies</NavLink>
          <NavLink to="/live" className={drawerLinkClass} onClick={closeMobile}><IcoLive />Live</NavLink>
          <NavLink to="/subscribe" className={drawerLinkClass} onClick={closeMobile}><IcoPlans />Subscription Plans</NavLink>

          {isAuthenticated && (
            <>
              <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">My Account</p>
              <NavLink to="/history" className={drawerLinkClass} onClick={closeMobile}><IcoHistory />Watch History</NavLink>
              <NavLink to="/creator" className={drawerLinkClass} onClick={closeMobile}><IcoCreator />Creator Dashboard</NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin" className={drawerLinkClass} onClick={closeMobile}><IcoAdmin />Admin Panel</NavLink>
              )}
              <NavLink to="/account" className={drawerLinkClass} onClick={closeMobile}><IcoAccount />My Account</NavLink>
            </>
          )}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-white/8 px-3 py-4 space-y-2">
          {isAuthenticated ? (
            <>
              {/* Offline toggle */}
              <button
                type="button"
                onClick={toggleOffline}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isOffline
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {isOffline
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    }
                  </svg>
                  {isOffline ? "Offline Mode" : "Go Offline"}
                </span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOffline ? "bg-amber-500" : "bg-emerald-500"}`} />
                </span>
              </button>

              {/* User card */}
              <div className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-sm font-bold text-white shadow">
                  {avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user?.displayName || "User"}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={() => { logout(); closeMobile(); }}
                className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-rose-500/30 hover:bg-rose-600/10 hover:text-rose-400"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={closeMobile}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/20"
            >
              Sign in to StreamVault
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
