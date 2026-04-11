import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../skeletons/Navbar";
import { Grid, PageShell, Row } from "./PopularPage";

const getImg = (anime) =>
  anime?.Images?.find((i) => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl ||
  "/placeholder-anime.jpg";

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
        const { data } = await axios.get(`/api/v1/anime/genre/${tagId}`, {
          params: { page: 1, per_page: 48 },
        });
        setAnimeList(data.data ?? []);
      } catch (error) {
        console.error(error);
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
        return items.sort((a, b) => (b.Score ?? 0) - (a.Score ?? 0));
      case "rank":
        return items.sort((a, b) => (a.Rank ?? Number.MAX_SAFE_INTEGER) - (b.Rank ?? Number.MAX_SAFE_INTEGER));
      case "title":
        return items.sort((a, b) => (a.Title ?? "").localeCompare(b.Title ?? ""));
      case "popularity":
      default:
        return items.sort((a, b) => (a.Popularity ?? Number.MAX_SAFE_INTEGER) - (b.Popularity ?? Number.MAX_SAFE_INTEGER));
    }
  }, [animeList, sortBy]);

  return (
    <PageShell>
      <Navbar />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shadow-lg"
              style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}
            >
              #
            </div>
            <span className="text-[11px] font-bold text-blue-400/80 tracking-[0.15em] uppercase">{tagType}</span>
          </div>
          <h1 className="text-4xl font-bold text-white">{tagName}</h1>
          <p className="text-gray-600 text-sm mt-1.5">Anime tagged with {tagName}</p>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Sort by</span>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSortBy(option.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                sortBy === option.key
                  ? "bg-blue-600 text-white"
                  : "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading anime...</p>
        ) : (
          <Grid>
            {sortedAnime.map((anime, index) => (
              <Link
                key={`${anime.MalId}-${index}`}
                to={`/anime/${anime.MalId}`}
                className="group block"
              >
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/[0.07] transition-all duration-300 group-hover:scale-[1.03] group-hover:border-white/[0.18] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                  style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.045) 0%,rgba(255,255,255,0.015) 100%)" }}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={getImg(anime)}
                      alt={anime.Title}
                      loading="lazy"
                      className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-anime.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    {anime.Type && (
                      <div className="absolute top-2.5 left-2.5 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {anime.Type}
                      </div>
                    )}
                    {anime.Rank && (
                      <div className="absolute top-2.5 right-2.5 bg-black/70 border border-white/10 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg">
                        #{anime.Rank}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 mb-2 group-hover:text-blue-300 transition-colors">
                      {anime.Title}
                    </h3>
                    <div className="space-y-1">
                      <Row label="Score" value={anime.Score ? `★ ${anime.Score}` : "N/A"} color="text-yellow-400" />
                      <Row label="Popularity" value={anime.Popularity ? `#${anime.Popularity}` : "N/A"} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </Grid>
        )}
      </div>
    </PageShell>
  );
}
