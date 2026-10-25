import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Grid, PageShell, Row } from "./PopularPage";
import { FaTag, FaStar } from "react-icons/fa";

const getImg = (anime) => {
  const images = anime?.images || anime?.Images;
  return (
    images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.imageUrl ||
    images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
    images?.[0]?.imageUrl ||
    images?.[0]?.ImageUrl ||
    "/placeholder-anime.jpg"
  );
};

const SORT_OPTIONS = [
  { key: "popularity", label: "Popularity" },
  { key: "score", label: "Score" },
  { key: "rank", label: "Rank" },
  { key: "title", label: "Title" },
];

export default function TagsPage() {
  const [searchParams] = useSearchParams();
  const tagId = Number(searchParams.get("tagId")) || null;
  const tagType = searchParams.get("type") || "genre";
  const tagName = searchParams.get("name") || "Tag";

  const [animeList, setAnimeList] = useState([]);
  const [sortBy, setSortBy] = useState("popularity");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tagId) return;

    const loadAnime = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/v1/anime/genre/${tagId}`, {
          params: { page: 1, per_page: 48 },
        });
        setAnimeList(data.data ?? []);
      } catch {
        // Tag query failed or cancelled
      } finally {
        setLoading(false);
      }
    };

    loadAnime();
  }, [tagId]);

  const sortedAnime = useMemo(() => {
    const items = [...animeList];
    switch (sortBy) {
      case "score":
        return items.sort((a, b) => (b.score ?? b.Score ?? 0) - (a.score ?? a.Score ?? 0));
      case "rank":
        return items.sort((a, b) => (a.rank ?? a.Rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? b.Rank ?? Number.MAX_SAFE_INTEGER));
      case "title":
        return items.sort((a, b) => (a.title ?? a.Title ?? "").localeCompare(b.title ?? b.Title ?? ""));
      case "popularity":
      default:
        return items.sort((a, b) => (a.popularity ?? a.Popularity ?? Number.MAX_SAFE_INTEGER) - (b.popularity ?? b.Popularity ?? Number.MAX_SAFE_INTEGER));
    }
  }, [animeList, sortBy]);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 mb-1.5">
            <FaTag className="text-xs text-rose-400" />
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{tagType}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{tagName}</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Explore titles tagged with {tagName}</p>
        </div>

        {/* Sort Filter Pills */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Sort by:</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortBy(option.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sortBy === option.key
                  ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm shadow-rose-500/20"
                  : "border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
            <span className="w-4 h-4 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            <span>Loading {tagName} anime...</span>
          </div>
        ) : sortedAnime.length === 0 ? (
          <div className="text-center py-20 border border-slate-800 rounded-xl bg-slate-900/20 text-slate-400 text-sm">
            No anime found for tag "{tagName}".
          </div>
        ) : (
          <Grid>
            {sortedAnime.map((anime, index) => {
              const malId = anime.malId ?? anime.MalId;
              const title = anime.title ?? anime.Title ?? "Untitled";
              const type = anime.type ?? anime.Type;
              const rank = anime.rank ?? anime.Rank;
              const score = anime.score ?? anime.Score;
              const popularity = anime.popularity ?? anime.Popularity;

              return (
                <Link
                  key={`${malId}-${index}`}
                  to={`/anime/${malId}`}
                  className="group block"
                >
                  {/* Poster container */}
                  <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800/80 group-hover:border-blue-500/50 shadow-sm transition-all duration-300 group-hover:-translate-y-1">
                    <img
                      src={getImg(anime)}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-anime.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {score != null && (
                      <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm border border-white/10 text-amber-400 text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <FaStar className="text-[9px]" />
                        <span>{score}</span>
                      </div>
                    )}

                    {type && (
                      <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
                        {type}
                      </div>
                    )}
                  </div>

                  {/* Metadata below */}
                  <div className="mt-2.5">
                    <h3 className="font-semibold text-slate-200 text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {title}
                    </h3>
                    <div className="space-y-0.5 mt-1">
                      {rank && <Row label="Rank" value={`#${rank}`} color="text-slate-300" />}
                      <Row label="Popularity" value={popularity ? `#${popularity}` : "N/A"} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </Grid>
        )}
      </div>
    </PageShell>
  );
}
