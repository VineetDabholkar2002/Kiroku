import { useEffect } from "react";
import Navbar from "../skeletons/Navbar";
import useAnimeData from "../hooks/useAnimeData";
import { Link } from "react-router-dom";
import { FaFire } from "react-icons/fa";

const getImg = (anime) =>
  anime?.Images?.find(i => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl || "/placeholder-anime.jpg";

const PopularPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("popular");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <Navbar />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <PageHeader icon={<FaFire />} accent="text-orange-400" label="Charts" title="Popular Anime" subtitle="Most popular anime series and movies" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => (
            <AnimeCard key={`${anime.MalId}-${i}`} to={`/anime/${anime.MalId}`} image={getImg(anime)} title={anime.Title} type={anime.Type} badge={`#${anime.Popularity}`} index={i}>
              <Row label="Score"   value={anime.Score ? `⭐ ${anime.Score}` : "N/A"} color="text-yellow-400" />
              <Row label="Members" value={anime.Members?.toLocaleString()} />
            </AnimeCard>
          ))}
        </Grid>
        {loading && <Spinner />}
        {isEnd && !loading && <EndMsg count={animeList.filter(a => !a.placeholder).length} />}
      </div>
    </PageShell>
  );
};

export default PopularPage;

// ─── Shared primitives (inlined to avoid extra import paths) ─────────────────

export function PageShell({ children }) {
  return (
    <div className="min-h-screen text-gray-200 relative overflow-x-hidden" style={{ background: "#080c14" }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)" }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.055) 0%,transparent 70%)" }} />
      </div>
      {children}
    </div>
  );
}

export function PageHeader({ icon, accent = "text-blue-400", label, title, subtitle }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shadow-lg"
          style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
          {icon}
        </div>
        <span className="text-[11px] font-bold text-blue-400/80 tracking-[0.15em] uppercase">{label}</span>
      </div>
      <h1 className="text-4xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-gray-600 text-sm mt-1.5">{subtitle}</p>}
    </div>
  );
}

export function Grid({ children }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {children}
    </div>
  );
}

export function AnimeCard({ to, image, title, type, badge, index = 0, children }) {
  return (
    <Link to={to} className="group block" style={{ animationDelay: `${Math.min(index * 30, 400)}ms` }}>
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] transition-all duration-300
        group-hover:scale-[1.03] group-hover:border-white/[0.18] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
        style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.045) 0%,rgba(255,255,255,0.015) 100%)" }}
      >
        <div className="relative overflow-hidden">
          <img src={image} alt={title} loading="lazy"
            className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          {badge && (
            <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg">
              {badge}
            </div>
          )}
          {type && (
            <div className="absolute top-2.5 left-2.5 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
              {type}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 mb-2 group-hover:text-blue-300 transition-colors">
            {title}
          </h3>
          <div className="space-y-1">{children}</div>
        </div>
      </div>
    </Link>
  );
}

export function Row({ label, value, color = "text-gray-400" }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-gray-600">{label}</span>
      <span className={color}>{value ?? "N/A"}</span>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-gray-600 text-sm">
      <span className="w-3.5 h-3.5 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      Loading more…
    </div>
  );
}

export function EndMsg({ count }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14">
      <div className="w-24 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }} />
      <p className="text-gray-700 text-xs">{count} titles · end of list</p>
    </div>
  );
}