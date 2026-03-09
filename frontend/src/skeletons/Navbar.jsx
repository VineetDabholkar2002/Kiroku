import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/popular", label: "Popular" },
    { path: "/top-rated", label: "Top Rated" },
    { path: "/airing", label: "Airing" },
    { path: "/upcoming", label: "Upcoming" },
    { path: "/favourites", label: "Favourites" },
    { path: "/search", label: "Search" },
    { path: "/playlist", label: "Playlist" },
  ];

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold gradient-text-mal">Kiroku</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === link.path
                    ? "bg-gradient-to-r from-blue-700 to-cyan-500 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 animate-fadeIn">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === link.path
                    ? "bg-gradient-to-r from-blue-700 to-cyan-500 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
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