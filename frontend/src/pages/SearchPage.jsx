import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { FaSearch, FaStar } from "react-icons/fa";
import AnimeListStatusControl from "../components/AnimeListStatusControl";
import { useAuth } from "../context/AuthContext";
import { EndMsg, Grid, PageShell, Row, Spinner } from "./PopularPage";

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

function SearchResultCard({ anime, currentEntry, onStatusChange }) {
  const malId = anime.malId ?? anime.MalId;
  const title = anime.title ?? anime.Title ?? "Untitled";
  const score = anime.score ?? anime.Score;
  const type = anime.type ?? anime.Type;
  const popularity = anime.popularity ?? anime.Popularity;
  const members = anime.members ?? anime.Members;

  return (
    <div className="group block">
      {/* Poster with status control badge */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800/80 group-hover:border-rose-500/40 shadow-sm transition-all duration-300 group-hover:-translate-y-1">
        <Link to={`/anime/${malId}`} className="block w-full h-full">
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
        </Link>

        {/* Top-Left: Type and Score Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
          {type && (
            <div className="bg-[#090d16]/95 backdrop-blur-sm border border-slate-700/80 text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shadow-md">
              {type}
            </div>
          )}
          {score && (
            <div className="bg-[#090d16]/95 backdrop-blur-sm border border-white/15 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md flex items-center gap-1">
              <FaStar className="text-[8px]" />
              <span>{score}</span>
            </div>
          )}
        </div>

        {/* Top-Right: Watchlist Status Control */}
        <div className="absolute top-2 right-2 z-10">
          <AnimeListStatusControl
            animeMalId={malId}
            animeTitle={title}
            initialStatus={currentEntry?.status ?? ""}
            initialScore={currentEntry?.score ?? 0}
            compact
            onStatusChange={onStatusChange}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-2.5">
        <Link to={`/anime/${malId}`} className="block">
          <h3 className="font-semibold text-slate-200 text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-rose-400 transition-colors">
            {title}
          </h3>
        </Link>
        <div className="space-y-0.5 mt-1">
          <Row label="Popularity" value={popularity ? `#${popularity}` : "N/A"} color="text-orange-400" />
          <Row label="Members" value={members?.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const { username } = useAuth();
  const [query, setQuery] = useState("");
  const [animeList, setAnimeList] = useState([]);
  const [userListMap, setUserListMap] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEnd, setIsEnd] = useState(false);

  // Robust refs to guard against rapid scroll / concurrent triggers
  const loadingRef = useRef(false);
  const isEndRef = useRef(false);
  const activeQueryRef = useRef("");
  const timerRef = useRef(null);

  const searchAnime = async (searchQuery, pageNum) => {
    if (!searchQuery.trim() || loadingRef.current) return;
    if (pageNum > 1 && isEndRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const { data } = await api.get("/api/v1/anime/search", {
        params: { query: searchQuery.trim(), page: pageNum },
      });
      const items = data.data ?? [];
      const hasMore = data.pagination?.hasNextPage ?? (items.length >= 25);

      if (items.length === 0) {
        isEndRef.current = true;
        setIsEnd(true);
        if (pageNum === 1) setAnimeList([]);
        return;
      }

      isEndRef.current = !hasMore;
      setIsEnd(!hasMore);
      setAnimeList((prev) => (pageNum === 1 ? items : [...prev, ...items]));
      setPage(pageNum);
    } catch (err) {
      console.error("Search request error:", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    activeQueryRef.current = trimmed;

    if (!trimmed) {
      setAnimeList([]);
      setPage(1);
      setIsEnd(false);
      isEndRef.current = false;
      return;
    }

    timerRef.current = setTimeout(() => {
      setPage(1);
      setIsEnd(false);
      isEndRef.current = false;
      searchAnime(trimmed, 1);
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Load user watch status
  useEffect(() => {
    if (!username) return;

    const loadUserList = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/by-username/${username}/anime-list`);
        setUserListMap(Object.fromEntries(data.map((item) => [item.animeMalId, item])));
      } catch {
        // Non-critical user list fetch
      }
    };

    loadUserList();
  }, [username]);

  // Infinite scroll
  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.scrollHeight - 300
      ) {
        if (!loadingRef.current && !isEndRef.current && activeQueryRef.current) {
          searchAnime(activeQueryRef.current, page + 1);
        }
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 mb-1.5">
            <FaSearch className="text-xs text-rose-400" />
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Search Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Search Anime</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Discover titles, check scores, and update your watchlist</p>
        </div>

        {/* Clean, Solid Search Input */}
        <div className="relative mb-8">
          <div className="relative flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 focus-within:border-rose-500/60 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all shadow-sm">
            <FaSearch className="text-slate-500 text-sm shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by anime title in English or Japanese..."
              autoFocus
              className="flex-1 bg-transparent text-slate-100 text-sm sm:text-base placeholder-slate-500 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-slate-500 hover:text-slate-300 transition-colors text-sm px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Initial Prompt */}
        {!query && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <FaSearch className="mx-auto text-3xl text-slate-600 mb-3" />
            <p className="text-slate-300 font-semibold text-sm">Find your next favorite anime</p>
            <p className="text-slate-500 text-xs mt-1">Type in any title above to search through thousands of series and movies</p>
          </div>
        )}

        {/* Empty State */}
        {query && !loading && animeList.length === 0 && isEnd && (
          <div className="flex flex-col items-center py-20 text-center border border-slate-800/80 rounded-xl bg-slate-900/20">
            <p className="text-slate-300 font-semibold text-sm">No results found for "{query}"</p>
            <p className="text-slate-500 text-xs mt-1">Check spelling or try a different keyword</p>
          </div>
        )}

        {/* Search Results Grid */}
        {animeList.length > 0 && (
          <Grid>
            {animeList.map((anime, index) => {
              const malId = anime.malId ?? anime.MalId;
              return (
                <SearchResultCard
                  key={`${malId}-${index}`}
                  anime={anime}
                  currentEntry={userListMap[malId] ?? null}
                  onStatusChange={(nextStatus, data) => {
                    setUserListMap((prev) => ({ ...prev, [malId]: { ...(data ?? {}), status: nextStatus } }));
                  }}
                />
              );
            })}
          </Grid>
        )}

        {loading && <Spinner />}
        {isEnd && animeList.length > 0 && !loading && <EndMsg count={animeList.length} />}
      </div>
    </PageShell>
  );
}
