import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FaSearch, FaChevronDown, FaCompass, FaMusic, FaComments, FaUser, FaSignOutAlt } from "react-icons/fa";

const BROWSE_LINKS = [
  { path: "/popular", label: "Popular", desc: "Most popular series" },
  { path: "/top-rated", label: "Top Rated", desc: "Highest scored all-time" },
  { path: "/airing", label: "Currently Airing", desc: "Episodes releasing now" },
  { path: "/upcoming", label: "Upcoming", desc: "Anticipated next season" },
  { path: "/favourites", label: "Favourites", desc: "Most favourited by fans" },
];

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, username, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const mobileMenuRef = useRef(null);
  const browseMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!mobileMenuRef.current?.contains(event.target)) {
        setMobileOpen(false);
      }
      if (!browseMenuRef.current?.contains(event.target)) {
        setBrowseOpen(false);
      }
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setBrowseOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  if (location.pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 bg-[#0b0e14]/95 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Left: Brand & Navigation */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="Kiroku"
                className="h-8 w-8 rounded-lg shadow-sm shadow-rose-500/20 ring-1 ring-white/10 object-cover group-hover:scale-105 transition-transform"
              />
              <span className="text-lg font-bold text-slate-100 tracking-tight group-hover:text-rose-400 transition-colors">
                Kiroku
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {/* Browse Dropdown */}
              <div className="relative" ref={browseMenuRef}>
                <button
                  type="button"
                  onClick={() => setBrowseOpen(!browseOpen)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    BROWSE_LINKS.some((link) => isActive(link.path))
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <FaCompass className="text-xs text-slate-400" />
                  <span>Browse</span>
                  <FaChevronDown className={`text-[10px] text-slate-400 transition-transform ${browseOpen ? "rotate-180" : ""}`} />
                </button>

                {browseOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-800 bg-[#0f141f] p-1.5 shadow-xl">
                    {BROWSE_LINKS.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex flex-col px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(link.path)
                            ? "bg-rose-500/15 text-rose-300 font-semibold"
                            : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                        }`}
                      >
                        <span>{link.label}</span>
                        <span className="text-[11px] text-slate-500 font-normal">{link.desc}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct Main Links */}
              <Link
                to="/soundtracks"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive("/soundtracks")
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <FaMusic className="text-xs text-slate-400" />
                <span>Soundtracks</span>
              </Link>

              <Link
                to="/chat"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive("/chat")
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <FaComments className="text-xs text-slate-400" />
                <span>Ask Kiroku</span>
              </Link>
            </div>
          </div>

          {/* Center/Right: Quick Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-xs items-center">
            <Link
              to="/search"
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                <FaSearch className="text-slate-500 text-xs" />
                <span>Search anime, soundtracks...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px] text-slate-400 font-mono">
                /
              </kbd>
            </Link>
          </div>

          {/* Right: Auth Profile / Sign In */}
          <div className="flex items-center gap-2.5">
            {/* Search Icon button for mobile / tablet */}
            <Link
              to="/search"
              aria-label="Search"
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <FaSearch className="text-sm" />
            </Link>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 transition text-sm font-medium"
                >
                  <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center text-xs font-bold uppercase">
                    {username ? username[0] : "U"}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold">{username}</span>
                  <FaChevronDown className={`text-[10px] text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-800 bg-[#0f141f] p-1.5 shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Signed in as</div>
                      <div className="text-sm font-bold text-slate-200 truncate">{username}</div>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition"
                    >
                      <FaUser className="text-slate-500 text-xs" />
                      <span>My Profile & List</span>
                    </Link>
                    <Link
                      to="/soundtracks"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition"
                    >
                      <FaMusic className="text-slate-500 text-xs" />
                      <span>Soundtracks</span>
                    </Link>
                    <div className="my-1 border-t border-slate-800/80" />
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <FaSignOutAlt className="text-xs" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-medium text-xs shadow-sm shadow-rose-500/20 transition"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <div className="md:hidden" ref={mobileMenuRef}>
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle navigation menu"
                className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {mobileOpen && (
                <div className="absolute right-4 top-16 w-60 rounded-xl border border-slate-800 bg-[#0f141f] p-2 shadow-2xl z-50">
                  <div className="space-y-1 pb-2 border-b border-slate-800/80 mb-2">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Browse</div>
                    {BROWSE_LINKS.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`block rounded-lg px-3 py-2 text-xs font-medium transition ${
                          isActive(link.path)
                            ? "bg-rose-500/15 text-rose-300 font-semibold"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Link
                      to="/soundtracks"
                      className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      Soundtracks
                    </Link>
                    <Link
                      to="/chat"
                      className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      AI Assistant
                    </Link>
                    <Link
                      to="/search"
                      className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      Search
                    </Link>
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/profile"
                          className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                        >
                          Profile & Anime List
                        </Link>
                        <button
                          type="button"
                          onClick={logout}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        className="block text-center rounded-lg px-3 py-2 text-xs font-medium bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500 transition"
                      >
                        Sign In
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </nav>
  );
}
