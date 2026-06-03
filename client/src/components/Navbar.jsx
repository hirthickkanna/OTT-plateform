import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
  }`;

const mobileNavClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
    isActive
      ? "bg-rose-600/20 text-white border border-rose-500/30"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
  }`;

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);

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
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    navigate("/");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#08080d]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 py-4 sm:px-6 lg:px-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={closeMobile}>
            <img src="/logo.png" alt="StreamVault" className="h-8 w-8 rounded-lg object-cover shadow-md shadow-black/40 group-hover:scale-105 transition-transform" />
            <span className="text-lg font-semibold tracking-tight text-white">StreamVault</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            <NavLink to="/#movies" className={navClass}>Movies</NavLink>
            <NavLink to="/live" className={navClass}>Live</NavLink>
            <NavLink to="/subscribe" className={navClass}>Plans</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/history" className={navClass}>My History</NavLink>
                <NavLink to="/creator" className={navClass}>Creator</NavLink>
                {user?.role === "admin" && (
                  <NavLink to="/admin" className={navClass}>Admin</NavLink>
                )}
                <NavLink to="/account" className={navClass}>Account</NavLink>
              </>
            )}
          </nav>

          <div className="flex-1" />

          {/* Search — desktop */}
          <form onSubmit={handleSearchSubmit} className="relative hidden items-center gap-2 sm:flex">
            <div className="relative">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-32 sm:w-48 md:w-64 rounded-lg bg-zinc-900/80 border border-white/10 hover:border-white/20 focus:border-rose-500/50 text-zinc-200 pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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

          {/* Auth — desktop */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-zinc-400 lg:inline">
                  {user?.displayName || user?.email}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Toggle mobile menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-auto flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 transition hover:bg-white/5 sm:hidden"
          >
            <span
              className={`block h-0.5 w-5 rounded bg-zinc-300 transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 rounded bg-zinc-300 transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 rounded bg-zinc-300 transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        onClick={closeMobile}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-[#0d0d14] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out sm:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2.5">
            <img src="/logo.png" alt="StreamVault" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-base font-semibold tracking-tight text-white">StreamVault</span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile Search */}
        <div className="px-4 py-4 border-b border-white/5">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/80 border border-white/10 focus:border-rose-500/50 text-zinc-200 pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all placeholder:text-zinc-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-zinc-500 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition cursor-pointer shrink-0"
            >
              Go
            </button>
          </form>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
            Browse
          </p>
          <NavLink to="/" end className={mobileNavClass} onClick={closeMobile}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </NavLink>
          <NavLink to="/#movies" className={mobileNavClass} onClick={closeMobile}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            Movies
          </NavLink>
          <NavLink to="/live" className={mobileNavClass} onClick={closeMobile}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76a6 6 0 010 8.49m-8.49-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
            </svg>
            Live
          </NavLink>
          <NavLink to="/subscribe" className={mobileNavClass} onClick={closeMobile}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Plans
          </NavLink>

          {isAuthenticated && (
            <>
              <p className="mb-2 mt-4 px-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                My Account
              </p>
              <NavLink to="/history" className={mobileNavClass} onClick={closeMobile}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                My History
              </NavLink>
              <NavLink to="/creator" className={mobileNavClass} onClick={closeMobile}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Creator
              </NavLink>
              {user?.role === "admin" && (
                <NavLink to="/admin" className={mobileNavClass} onClick={closeMobile}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                  </svg>
                  Admin
                </NavLink>
              )}
              <NavLink to="/account" className={mobileNavClass} onClick={closeMobile}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account
              </NavLink>
            </>
          )}
        </nav>

        {/* Drawer Footer — Auth */}
        <div className="border-t border-white/10 px-4 py-4">
          {isAuthenticated ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-sm font-bold text-white">
                  {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.displayName || "User"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { logout(); closeMobile(); }}
                className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-rose-500/40 hover:bg-rose-600/10 hover:text-rose-400"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={closeMobile}
              className="flex w-full items-center justify-center rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
