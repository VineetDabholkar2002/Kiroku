import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimeSlider from "../components/AnimeSlider";
import { FaPlay, FaMusic, FaStar, FaFire, FaCompass, FaCalendarAlt, FaBroadcastTower, FaHeart } from "react-icons/fa";
import api from "../services/api";

const QUICK_FILTERS = [
  { label: "Trending", path: "/popular", icon: <FaFire className="text-orange-400" /> },
  { label: "Top Rated", path: "/top-rated", icon: <FaStar className="text-amber-400" /> },
  { label: "Airing Now", path: "/airing", icon: <FaBroadcastTower className="text-emerald-400" /> },
  { label: "Upcoming", path: "/upcoming", icon: <FaCalendarAlt className="text-cyan-400" /> },
  { label: "Favourites", path: "/favourites", icon: <FaHeart className="text-rose-400" /> },
  { label: "Soundtracks", path: "/soundtracks", icon: <FaMusic className="text-purple-400" /> },
];

const MainPage = () => {
  const [spotlights, setSpotlights] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingHero, setLoadingHero] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch top popular anime for the spotlight hero
  useEffect(() => {
    let isCancelled = false;
    const loadSpotlights = async () => {
      try {
        const { data } = await api.get("/api/v1/anime/popular", { params: { page: 1, per_page: 5 } });
        if (!isCancelled && data?.data && data.data.length > 0) {
          setSpotlights(data.data);
        }
      } catch (err) {
        console.error("Failed to load spotlight anime:", err);
      } finally {
        if (!isCancelled) setLoadingHero(false);
      }
    };
    loadSpotlights();
    return () => { isCancelled = true; };
  }, []);

  // Auto-advance spotlight hero every 7 seconds
  useEffect(() => {
    if (spotlights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % spotlights.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [spotlights.length]);

  const activeAnime = spotlights[activeIndex];

  const getPoster = (anime) => {
    const images = anime?.images || anime?.Images;
    return (
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "jpg")?.largeImageUrl ||
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "jpg")?.imageUrl ||
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
      images?.[0]?.imageUrl ||
      images?.[0]?.ImageUrl ||
      "/placeholder-anime.jpg"
    );
  };

  const activeMalId = activeAnime?.malId ?? activeAnime?.MalId;
  const activeTitle = activeAnime?.titleEnglish || activeAnime?.title || activeAnime?.Title || "Featured Anime";
  const activeSubTitle = activeAnime?.titleJapanese || activeAnime?.title || "";
  const activeScore = activeAnime?.score ?? activeAnime?.Score;
  const activeType = activeAnime?.type ?? activeAnime?.Type ?? "TV";
  const activeYear = activeAnime?.year ?? activeAnime?.Year;
  const activeSynopsis = activeAnime?.synopsis ?? activeAnime?.Synopsis ?? "No description available.";

  return (
    <div className="min-h-screen text-slate-200 bg-[#0b0e14]">

      {/* ── Featured Anime Spotlight Hero ───────────────────────────────────────── */}
      <div className="relative w-full border-b border-slate-800/80 bg-slate-950 overflow-hidden">
        {loadingHero || !activeAnime ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex flex-col justify-center min-h-[460px]">
            <div className="h-6 w-32 bg-slate-800 rounded animate-pulse mb-4" />
            <div className="h-10 w-96 bg-slate-800 rounded animate-pulse mb-3" />
            <div className="h-4 w-60 bg-slate-800/80 rounded animate-pulse mb-6" />
            <div className="h-16 max-w-xl bg-slate-800/50 rounded animate-pulse mb-8" />
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-10 w-32 bg-slate-800/60 rounded-lg animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 min-h-[460px] sm:min-h-[500px] flex items-center">
            
            {/* Cinematic Backdrop Image Blend */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <img
                src={getPoster(activeAnime)}
                alt={activeTitle}
                className="w-full h-full object-cover object-top opacity-20 filter blur-sm scale-105 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14] via-[#0b0e14]/90 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-[#0b0e14]/40" />
            </div>

            {/* Spotlight Content Area */}
            <div className="relative z-10 py-12 sm:py-16 max-w-2xl">
              
              {/* Category / Rank Badge */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider mb-3.5">
                <FaFire className="text-[11px]" />
                <span>Featured #{activeIndex + 1} Spotlight</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-2">
                {activeTitle}
              </h1>

              {activeSubTitle && activeSubTitle !== activeTitle && (
                <p className="text-xs sm:text-sm text-slate-400 font-medium mb-4 line-clamp-1">
                  {activeSubTitle}
                </p>
              )}

              {/* Metadata Badges */}
              <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold mb-5 flex-wrap">
                {activeScore != null && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-amber-400">
                    <FaStar className="text-[11px]" />
                    <span>{Number(activeScore).toFixed(2)}</span>
                  </div>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 uppercase">
                  {activeType}
                </span>
                {activeYear && (
                  <span className="text-slate-400">
                    {activeYear}
                  </span>
                )}
              </div>

              {/* Synopsis excerpt */}
              <p className="text-sm text-slate-300/90 leading-relaxed mb-7 line-clamp-3 max-w-xl">
                {activeSynopsis}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to={`/anime/${activeMalId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm shadow-md shadow-rose-500/20 transition-all active:scale-95"
                >
                  <FaPlay className="text-xs" />
                  <span>Explore Series</span>
                </Link>

                <Link
                  to="/soundtracks"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-all"
                >
                  <FaMusic className="text-xs text-slate-400" />
                  <span>Soundtracks</span>
                </Link>
              </div>

            </div>

            {/* Spotlight Carousel Switcher (Bottom Right) */}
            {spotlights.length > 1 && (
              <div className="absolute right-4 sm:right-6 bottom-6 z-20 flex items-center gap-2">
                {spotlights.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Go to spotlight slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === activeIndex
                        ? "w-8 bg-rose-500"
                        : "w-2 bg-slate-700 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Quick Discovery Filter Strip ────────────────────────────────────────── */}
      <div className="border-b border-slate-800/80 bg-[#0d111a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1.5">
              <FaCompass className="text-slate-400" /> Discover:
            </span>
            {QUICK_FILTERS.map((filter) => (
              <Link
                key={filter.path}
                to={filter.path}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition shrink-0"
              >
                {filter.icon}
                <span>{filter.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content Rails ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <AnimeSlider rankingType="bypopularity" title="Trending Now" />
        <AnimeSlider rankingType="top-rated"    title="All-Time Top Rated" />
        <AnimeSlider rankingType="airing"       title="Currently Airing Episodes" />
        <AnimeSlider rankingType="upcoming"     title="Most Anticipated Releases" />
        <AnimeSlider rankingType="favorite"     title="Fan Favourites Worldwide" />

        {/* ── Spotify Soundtrack Callout Card ─────────────────────────────────── */}
        <div className="my-10 p-6 sm:p-8 rounded-xl border border-slate-800 bg-[#0f141f] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <FaMusic className="text-[10px]" />
              <span>Spotify Integration</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Create Spotify Playlists From Your Anime List
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Automatically gather opening and ending themes from anime you've watched, search custom tracks, and sync full playlists straight to your Spotify library.
            </p>
          </div>

          <Link
            to="/soundtracks"
            className="shrink-0 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
          >
            Launch Soundtrack Maker
          </Link>
        </div>
      </main>

      {/* ── Site Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-[#080b10] mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kiroku" className="w-5 h-5 rounded object-cover shadow-sm shadow-rose-500/20" /><span className="font-bold text-slate-200">Kiroku</span>
            <span>·</span>
            <span>Anime tracking & Spotify playlist engine</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/popular" className="hover:text-slate-300 transition">Popular</Link>
            <Link to="/top-rated" className="hover:text-slate-300 transition">Top Rated</Link>
            <Link to="/soundtracks" className="hover:text-slate-300 transition">Soundtracks</Link>
            <Link to="/search" className="hover:text-slate-300 transition">Search</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default MainPage;
