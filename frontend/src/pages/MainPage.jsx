import { useEffect } from "react";
import { Link } from "react-router-dom";
import AnimeSlider from "../skeletons/AnimeSlider";
import Navbar from "../skeletons/Navbar";
import { FaSearch, FaFire, FaStar } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

const MainPage = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen text-gray-200 relative overflow-x-hidden" style={{ background: "#080c14" }}>

      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)" }} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 70%)" }} />
      </div>

      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: "520px" }}>
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-20"
          style={{ background: "radial-gradient(circle,#3b82f6 0%,#7c3aed 50%,transparent 70%)" }} />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-24">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-blue-300 tracking-wider uppercase">
            <HiSparkles className="text-blue-400" />
            Your anime tracking companion
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-none tracking-tight">
            <span className="text-white">Ki</span>
            <span style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>roku</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Discover trending series, explore top-rated classics, and build your personal anime soundtrack playlist.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white
                shadow-lg shadow-blue-600/25 active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}
            >
              Login
            </Link>
            <Link to="/popular"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-white
                bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
            >
              <FaFire /> Explore Popular
            </Link>
            <Link to="/search"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-sm text-gray-300
                bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            >
              <FaSearch /> Search Anime
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {[
              { label: "Anime in database", value: "20,000+" },
              { label: "Theme songs", value: "50,000+" },
              { label: "Genres covered", value: "40+" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sliders ───────────────────────────────────────────────────────── */}
      <div className="relative space-y-2 pb-16">
        <AnimeSlider rankingType="bypopularity" title="Trending" />
        <AnimeSlider rankingType="top-rated"    title="Top Rated" />
        <AnimeSlider rankingType="airing"       title="Currently Airing" />
        <AnimeSlider rankingType="upcoming"     title="Upcoming" />
      </div>
    </div>
  );
};

export default MainPage;
