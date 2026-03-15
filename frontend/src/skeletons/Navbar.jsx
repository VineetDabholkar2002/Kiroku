import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const NAV_LINKS = [
  { path: "/",          label: "Home" },
  { path: "/popular",   label: "Popular" },
  { path: "/top-rated", label: "Top Rated" },
  { path: "/airing",    label: "Airing" },
  { path: "/upcoming",  label: "Upcoming" },
  { path: "/favourites",label: "Favourites" },
  { path: "/search",    label: "Search" },
  { path: "/playlist",  label: "Playlist" },
];

const Navbar = () => {
  const location   = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.07]"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(20px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-lg font-black tracking-tight"
              style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Kiroku
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link key={link.path} to={link.path}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150
                  ${isActive(link.path)
                    ? "text-white bg-white/10 border border-white/10"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.07] transition-colors text-gray-400"
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-white/[0.07] py-3 space-y-0.5">
            {NAV_LINKS.map((link) => (
              <Link key={link.path} to={link.path}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive(link.path)
                    ? "text-white bg-white/10"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;