import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import AnimeListStatusControl from "../components/AnimeListStatusControl";
import { useAuth } from "../context/AuthContext";
import Navbar from "../skeletons/Navbar";
import { EndMsg, Grid, PageShell, Row, Spinner } from "./PopularPage";

const getImg = (anime) =>
  anime?.Images?.find((i) => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl ||
  "/placeholder-anime.jpg";

function SearchResultCard({ anime, currentEntry, onStatusChange }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/[0.07] transition-all duration-300 hover:border-white/[0.18] hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.045) 0%,rgba(255,255,255,0.015) 100%)" }}
    >
      <Link to={`/anime/${anime.MalId}`} className="group block">
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
          <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
            {anime.Score && (
              <div className="bg-black/70 backdrop-blur-sm border border-white/10 text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg">
                {`★ ${anime.Score}`}
              </div>
            )}
            <AnimeListStatusControl
              animeMalId={anime.MalId}
              initialStatus={currentEntry?.status ?? ""}
              initialScore={currentEntry?.score ?? 0}
              compact
              onStatusChange={onStatusChange}
            />
          </div>
          {anime.Type && (
            <div className="absolute top-2.5 left-2.5 bg-blue-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
              {anime.Type}
            </div>
          )}
        </div>
        <div className="p-3 pb-2">
          <h3 className="font-semibold text-white text-[13px] leading-snug line-clamp-2 mb-2 group-hover:text-blue-300 transition-colors">
            {anime.Title}
          </h3>
          <div className="space-y-1">
            <Row label="Popularity" value={anime.Popularity ? `#${anime.Popularity}` : "N/A"} color="text-orange-400" />
            <Row label="Members" value={anime.Members?.toLocaleString()} />
          </div>
        </div>
      </Link>
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
  const timer = useRef(null);

  const fetchResults = useCallback(async (nextPage = page) => {
    if (loading || !query.trim()) return;

    try {
      setLoading(true);
      const { data } = await axios.get("/api/v1/anime/search", { params: { query, page: nextPage } });
      const items = data.data;
      if (!items?.length) {
        setIsEnd(true);
        return;
      }
      setAnimeList((prev) => (nextPage === 1 ? items : [...prev, ...items]));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [loading, page, query]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setAnimeList([]);
      return;
    }

    timer.current = setTimeout(() => {
      setPage(1);
      setIsEnd(false);
      setAnimeList([]);
      fetchResults(1);
    }, 400);

    return () => clearTimeout(timer.current);
  }, [fetchResults, query]);

  useEffect(() => {
    if (page > 1) fetchResults();
  }, [fetchResults, page]);

  useEffect(() => {
    if (!username) return;

    const loadUserList = async () => {
      try {
        const { data } = await axios.get(`/api/v1/user/by-username/${username}/anime-list`);
        setUserListMap(Object.fromEntries(data.map((item) => [item.animeMalId, item])));
      } catch (error) {
        console.error(error);
      }
    };

    loadUserList();
  }, [username]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.scrollHeight - 200) {
        if (!loading && !isEnd) setPage((current) => current + 1);
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isEnd, loading]);

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
              <FaSearch />
            </div>
            <span className="text-[11px] font-bold text-blue-400/80 tracking-[0.15em] uppercase">Discover</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Search Anime</h1>
          <p className="text-gray-600 text-sm mt-1.5">Find any anime and add it to your list</p>
        </div>

        <div className="relative mb-10">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-20"
            style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}
          />
          <div className="relative flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.05] px-5 py-4 focus-within:border-blue-500/50 focus-within:bg-white/[0.07] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all">
            <FaSearch className="text-gray-500 text-sm shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for any anime title..."
              autoFocus
              className="flex-1 bg-transparent text-white text-base placeholder-gray-600 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-600 hover:text-white transition-colors text-sm">
                ×
              </button>
            )}
          </div>
        </div>

        {animeList.length > 0 && (
          <p className="text-gray-600 text-xs mb-6">
            {animeList.length} result{animeList.length !== 1 ? "s" : ""} for <span className="text-gray-400">"{query}"</span>
          </p>
        )}

        {!query && (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <FaSearch className="text-2xl text-gray-700" />
            </div>
            <p className="text-gray-500 font-medium">Start typing to search</p>
            <p className="text-gray-700 text-sm mt-1">Search across 20,000+ anime titles</p>
          </div>
        )}

        {query && !loading && animeList.length === 0 && isEnd && (
          <div className="flex flex-col items-center py-24 text-center">
            <p className="text-gray-400 font-medium text-lg">No results for "{query}"</p>
            <p className="text-gray-600 text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {animeList.length > 0 && (
          <Grid>
            {animeList.map((anime, index) => (
              <SearchResultCard
                key={`${anime.MalId}-${index}`}
                anime={anime}
                currentEntry={userListMap[anime.MalId] ?? null}
                onStatusChange={(nextStatus, data) => {
                  setUserListMap((prev) => ({ ...prev, [anime.MalId]: { ...(data ?? {}), status: nextStatus } }));
                }}
              />
            ))}
          </Grid>
        )}

        {loading && <Spinner />}
        {isEnd && animeList.length > 0 && !loading && <EndMsg count={animeList.length} />}
      </div>
    </PageShell>
  );
}
