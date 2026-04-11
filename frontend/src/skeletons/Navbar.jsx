import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const PRIMARY_LINKS = [
  { path: "/", label: "Home" },
  { path: "/search", label: "Search" },
  { path: "/profile", label: "Profile" },
];

const MENU_LINKS = [
  { path: "/popular", label: "Popular" },
  { path: "/top-rated", label: "Top Rated" },
  { path: "/airing", label: "Airing" },
  { path: "/upcoming", label: "Upcoming" },
  { path: "/favourites", label: "Favourites" },
  { path: "/playlist", label: "Playlist" },
  { path: "/chat", label: "Chat" },
];

export default function Navbar() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const visiblePrimaryLinks = isAuthenticated ? PRIMARY_LINKS : PRIMARY_LINKS.filter((link) => link.path === "/");
  const visibleMenuLinks = isAuthenticated ? MENU_LINKS : [];
  const isActive = (path) => location.pathname === path;
  const hasActiveMenuItem = visibleMenuLinks.some((link) => isActive(link.path));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/[0.07]"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(20px)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl shadow-lg shadow-blue-500/20"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}
            >
              <span className="text-sm font-black text-white">K</span>
            </div>
            <span
              className="text-lg font-black tracking-tight"
              style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Kiroku
            </span>
          </Link>

          <div className="flex items-center gap-2" ref={menuRef}>
            <div className="hidden md:flex items-center gap-1">
              {visiblePrimaryLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive(link.path)
                      ? "border border-white/10 bg-white/10 text-white"
                      : "text-gray-500 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                open || hasActiveMenuItem
                  ? "border-white/10 bg-white/10 text-white"
                  : "border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white"
              }`}
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <span>Menu</span>
              <svg className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="hidden rounded-lg px-3.5 py-2 text-xs font-semibold text-gray-500 transition-all duration-150 hover:bg-white/[0.06] hover:text-white md:block"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className={`hidden rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-150 md:block ${
                  isActive("/login")
                    ? "border border-white/10 bg-white/10 text-white"
                    : "text-gray-500 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                Login
              </Link>
            )}

            {open && (
              <div className="absolute right-4 top-[4.5rem] w-[17rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c121d]/95 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:right-6">
                <div className="md:hidden border-b border-white/[0.06] pb-2 mb-2">
                  {visiblePrimaryLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="space-y-1">
                  {visibleMenuLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive(link.path)
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-2 border-t border-white/[0.06] pt-2 md:hidden">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setOpen(false);
                      }}
                      className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-400 transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      Logout
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive("/login")
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
