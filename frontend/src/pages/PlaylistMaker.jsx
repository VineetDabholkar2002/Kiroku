import { useState, useRef, useEffect, useCallback, memo } from "react";
import axios from "axios";
import Navbar from "../skeletons/Navbar";
import { FaSortAlphaDown, FaSortAlphaUp, FaSearch, FaPlay, FaSpotify, FaMusic, FaPause } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { useSpotify } from "../context/SpotifyContext";


const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: "all",         label: "All",           gradient: "from-slate-500 to-slate-600" },
  { key: "completed",   label: "Completed",     gradient: "from-emerald-500 to-teal-600" },
  { key: "plantowatch", label: "Plan to Watch", gradient: "from-violet-500 to-purple-600" },
  { key: "watching",    label: "Watching",      gradient: "from-blue-500 to-cyan-600" },
];

const SEARCH_MODES = [
  { key: "both",  label: "All"   },
  { key: "song",  label: "Song"  },
  { key: "anime", label: "Anime" },
];

const STATUS_BADGE = {
  completed:   "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  watching:    "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  plantowatch: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
};


function applyFiltersAndSort(songs, { searchQuery, searchMode, statusFilter, sortBy }) {
  const q = searchQuery.toLowerCase();
  return songs
    .filter((s) => {
      const matchesSearch =
        !q ||
        (searchMode !== "anime" && s.name?.toLowerCase().includes(q)) ||
        (searchMode !== "song"  && s.animeTitle?.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "all" ||
        s.status?.toLowerCase().replace(/\s+/g, "") === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const valA = (sortBy === "name" ? a.name : a.animeTitle) ?? "";
      const valB = (sortBy === "name" ? b.name : b.animeTitle) ?? "";
      return valA.localeCompare(valB);
    });
}

function statusBadgeClass(status) {
  if (!status) return "";
  return STATUS_BADGE[status.toLowerCase().replace(/\s+/g, "")] ?? "bg-gray-500/20 text-gray-300 border border-gray-500/30";
}


const SongCard = memo(function SongCard({ song, isCurrent, onPlay, canPlay }) {
  const artistLabel = Array.isArray(song.artist)
    ? song.artist.join(", ")
    : (song.artist ?? "Unknown Artist");

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300
        ${isCurrent
          ? "ring-2 ring-emerald-400/60 shadow-[0_0_32px_rgba(52,211,153,0.2)] scale-[1.02]"
          : "hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        }`}
      style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.018) 100%)" }}
    >
      <div className={`absolute inset-0 rounded-2xl border pointer-events-none transition-colors duration-300
        ${isCurrent ? "border-emerald-400/40" : "border-white/[0.07] group-hover:border-white/[0.15]"}`}
      />

      <div className="relative overflow-hidden aspect-square">
        <img
          src={song.image}
          alt={song.name ?? "Song cover"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

        {isCurrent && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-full tracking-wider">
            <span className="flex gap-[2px] items-end" style={{height:"10px"}}>
              {[0, 150, 75, 225].map((delay, i) => (
                <span key={i} className="w-[2px] bg-black rounded-full animate-bounce"
                  style={{ height: `${[40,100,60,80][i]}%`, animationDelay: `${delay}ms`, animationDuration: "0.7s" }} />
              ))}
            </span>
            PLAYING
          </div>
        )}

        {canPlay && (
          <button
            onClick={onPlay}
            aria-label={`Play ${song.name}`}
            className={`absolute bottom-2.5 right-2.5 w-10 h-10 flex items-center justify-center rounded-full
              bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-black/50
              transition-all duration-200 hover:scale-110
              ${isCurrent ? "opacity-100" : "opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0"}`}
          >
            {isCurrent
              ? <FaPause className="text-black text-xs" />
              : <FaPlay className="text-black text-xs ml-0.5" />
            }
          </button>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="font-semibold text-white text-[13px] leading-snug truncate">{song.name}</h3>
        <p className="text-[11px] text-gray-500 truncate mt-0.5">{artistLabel}</p>
        {song.animeTitle && (
          <p className="flex items-center gap-1 text-[11px] text-blue-400/75 truncate mt-1.5">
            <HiSparkles className="shrink-0 text-[10px]" />
            {song.animeTitle}
          </p>
        )}
        {song.status && (
          <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadgeClass(song.status)}`}>
            {song.status}
          </span>
        )}
      </div>
    </div>
  );
});


function SpotifyConnectBanner({ onConnect }) {
  return (
    <div className="mb-8 relative overflow-hidden rounded-2xl border border-emerald-500/20"
      style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.07) 0%,rgba(6,182,212,0.04) 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.12),transparent_65%)] pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-5 p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <FaSpotify className="text-emerald-400 text-xl" />
          </div>
          <div>
            <p className="text-white font-semibold">Connect Spotify to enable playback</p>
            <p className="text-gray-500 text-sm mt-0.5">Your account's own token is used â€” credentials never touch our servers.</p>
          </div>
        </div>
        <button
          onClick={onConnect}
          className="shrink-0 flex items-center gap-2.5 px-6 py-2.5 rounded-full font-bold text-sm text-black
            bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
        >
          <FaSpotify />
          Connect Spotify
        </button>
      </div>
    </div>
  );
}


function SpotifyUserPill({ user, onDisconnect }) {
  return (
    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
      {user?.images?.[0]?.url
        ? <img src={user.images[0].url} alt="" className="w-5 h-5 rounded-full" />
        : <FaSpotify className="text-emerald-400 text-xs" />
      }
      <span className="text-emerald-300 font-medium text-xs">{user?.display_name ?? "Connected"}</span>
      <button onClick={onDisconnect} className="text-gray-600 hover:text-red-400 transition-colors text-xs ml-0.5" aria-label="Disconnect Spotify">âœ•</button>
    </div>
  );
}


function StatsBar({ allSongs }) {
  const stats = [
    { label: "Total",        value: allSongs.length,                                                                                     color: "text-white" },
    { label: "Completed",    value: allSongs.filter(s => s.status?.toLowerCase().replace(/\s+/g,"") === "completed").length,   color: "text-emerald-400" },
    { label: "Watching",     value: allSongs.filter(s => s.status?.toLowerCase().replace(/\s+/g,"") === "watching").length,    color: "text-blue-400" },
    { label: "Plan to watch",value: allSongs.filter(s => s.status?.toLowerCase().replace(/\s+/g,"") === "plantowatch").length, color: "text-violet-400" },
  ];
  return (
    <div className="flex items-center gap-8 mb-8 pb-7 border-b border-white/[0.07] flex-wrap">
      {stats.map(({ label, value, color }) => (
        <div key={label}>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-[11px] text-gray-600 mt-0.5 uppercase tracking-wider">{label}</div>
        </div>
      ))}
    </div>
  );
}


function FilterBar({ searchQuery, onSearch, searchMode, onSearchMode, statusFilter, onStatus, sortBy, onSort }) {
  const placeholder =
    searchMode === "song"  ? "Search by song nameâ€¦" :
    searchMode === "anime" ? "Search by anime titleâ€¦" :
                             "Search songs & animeâ€¦";
  return (
    <div className="mb-7 space-y-3">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex flex-1 min-w-[220px] items-center rounded-xl border border-white/[0.08] bg-white/[0.04]
          focus-within:border-blue-500/40 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]
          transition-all duration-200 overflow-hidden">
          <FaSearch className="ml-4 text-gray-600 text-xs shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-3 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          <div className="flex border-l border-white/[0.08]">
            {SEARCH_MODES.map((m) => (
              <button key={m.key} onClick={() => onSearchMode(m.key)}
                className={`px-3 py-3 text-xs font-semibold transition-all
                  ${searchMode === m.key ? "bg-blue-600/70 text-white" : "text-gray-600 hover:text-white hover:bg-white/[0.08]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onSort}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold
            bg-white/[0.04] border border-white/[0.08] text-gray-400
            hover:bg-white/[0.08] hover:text-white hover:border-white/15 active:scale-95 transition-all"
        >
          {sortBy === "name" ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
          {sortBy === "name" ? "Song" : "Anime"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.key} onClick={() => onStatus(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95
              ${statusFilter === f.key
                ? `bg-gradient-to-r ${f.gradient} text-white shadow-md`
                : "bg-white/[0.05] border border-white/[0.08] text-gray-500 hover:text-white hover:bg-white/[0.1] hover:border-white/15"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}


function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-white/[0.06] animate-pulse">
          <div className="aspect-square bg-white/[0.04]" />
          <div className="p-3.5 space-y-2">
            <div className="h-2.5 bg-white/[0.06] rounded-full w-3/4" />
            <div className="h-2 bg-white/[0.04] rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}


function EmptyHero() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 border border-white/[0.08] flex items-center justify-center">
          <FaMusic className="text-3xl text-blue-400/50" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-blue-500/5 blur-xl" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Discover an Anime Playlist</h2>
      <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
        Enter a username above to explore their full anime soundtrack collection.
      </p>
    </div>
  );
}


export default function PlaylistMaker() {
  const {
    setPlaylist, currentTrackIndex, playTrackAtIndex,
    isSpotifyConnected, accessToken, spotifyUser,
    connectSpotify, disconnectSpotify,
  } = useSpotify();

  const [allSongs, setAllSongs]               = useState([]);
  const [displayedSongs, setDisplayedSongs]   = useState([]);
  const [hasMore, setHasMore]                 = useState(false);
  const [inputUsername, setInputUsername]     = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchedUsername, setFetchedUsername] = useState("");
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchMode, setSearchMode]           = useState("both");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [sortBy, setSortBy]                   = useState("name");
  const [savingPlaylist, setSavingPlaylist]   = useState(false);
  const [playlistSaveMessage, setPlaylistSaveMessage] = useState(null);
  const [saveProgress, setSaveProgress]       = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const observerRef = useRef(null);
  const suggestionBoxRef = useRef(null);

  const fetchPlaylist = useCallback(async (username) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setError(null); setLoading(true);
    setAllSongs([]); setDisplayedSongs([]);
    setHasMore(false); setFetchedUsername("");
    setPlaylistSaveMessage(null);
    setSaveProgress(null);
    setShowSuggestions(false);
    try {
      const { data } = await axios.get(`/api/v1/playlist/${trimmed}`);
      setAllSongs(data);
      setDisplayedSongs(data.slice(0, PAGE_SIZE));
      setHasMore(data.length > PAGE_SIZE);
      setFetchedUsername(trimmed);
      setPlaylist(data);
    } catch {
      setError(`Could not load playlist for "${trimmed}".`);
    } finally {
      setLoading(false);
    }
  }, [setPlaylist]);

  useEffect(() => {
    const trimmed = inputUsername.trim();
    if (!trimmed) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get("/api/v1/playlist/suggest-users", {
          params: { query: trimmed, limit: 6 }
        });
        setUserSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (err) {
        console.error(err);
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [inputUsername]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!suggestionBoxRef.current?.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!allSongs.length) return;
    const filtered = applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, sortBy });
    setDisplayedSongs(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }, [allSongs, searchQuery, searchMode, statusFilter, sortBy]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const filtered = applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, sortBy });
    const nextEnd = displayedSongs.length + PAGE_SIZE;
    setDisplayedSongs(filtered.slice(0, nextEnd));
    setHasMore(filtered.length > nextEnd);
  }, [loading, hasMore, allSongs, searchQuery, searchMode, statusFilter, sortBy, displayedSongs.length]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target || !fetchedUsername) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: "300px" });
    obs.observe(target);
    return () => obs.unobserve(target);
  }, [loadMore, fetchedUsername]);

  const handlePlay = useCallback(async (index, song) => {
    if (!isSpotifyConnected) { connectSpotify(); return; }
    try {
      const { data } = await axios.get("/api/v1/spotify/song", {
        params: { name: song.name, artist: Array.isArray(song.artist) ? song.artist[0] : song.artist },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (data?.tracks?.length > 0) playTrackAtIndex(index, data.tracks[0]);
      else alert("Song not found on Spotify.");
    } catch (err) {
      if (err.response?.status === 401) { alert("Spotify session expired. Please reconnect."); disconnectSpotify(); }
      else alert("Spotify search failed. Please try again.");
    }
  }, [isSpotifyConnected, accessToken, connectSpotify, disconnectSpotify, playTrackAtIndex]);

  const handleSaveToSpotify = useCallback(async () => {
    if (!fetchedUsername || allSongs.length === 0 || savingPlaylist) return;
    if (!isSpotifyConnected) {
      connectSpotify();
      return;
    }

    setSavingPlaylist(true);
    setPlaylistSaveMessage(null);
    setSaveProgress({ percent: 0, message: "Creating Spotify playlist..." });

    try {
      const response = await fetch("/api/v1/spotify/playlist-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: `${fetchedUsername}'s Anime Playlist`,
          description: `Created by Kiroku from ${fetchedUsername}'s anime soundtrack results.`,
          songs: allSongs.map((song) => ({
            animeTitle: song.animeTitle ?? "",
            name: song.name ?? "",
            artist: Array.isArray(song.artist) ? song.artist[0] ?? "" : (song.artist ?? ""),
            image: song.image ?? null,
            status: song.status ?? "",
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Could not start playlist save.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (!completed) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();
          if (!eventName || !dataLine) continue;

          const payload = JSON.parse(dataLine);

          if (eventName === "progress") {
            setSaveProgress({
              percent: payload.percent ?? 0,
              message: payload.message ?? "Saving playlist...",
            });
          }

          if (eventName === "complete") {
            setSaveProgress({
              percent: 100,
              message: payload.message ?? "Playlist created on Spotify.",
            });
            setPlaylistSaveMessage({
              type: "success",
              text: payload?.playlistUrl
                ? `Saved ${payload.addedCount ?? 0} tracks to Spotify.`
                : payload?.message ?? "Playlist created on Spotify.",
              playlistUrl: payload?.playlistUrl ?? null,
            });
            completed = true;
            break;
          }

          if (eventName === "error") {
            if (payload?.status === 401) {
              disconnectSpotify();
            }
            setPlaylistSaveMessage({
              type: "error",
              text: payload?.message ?? "Could not save the playlist to Spotify.",
              playlistUrl: null,
            });
            setSaveProgress(null);
            completed = true;
            break;
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setPlaylistSaveMessage({
          type: "error",
          text: "Spotify session expired. Reconnect and try again.",
          playlistUrl: null,
        });
        disconnectSpotify();
      } else {
        setPlaylistSaveMessage({
          type: "error",
          text: err.response?.data?.message ?? err.message ?? "Could not save the playlist to Spotify.",
          playlistUrl: null,
        });
      }
      setSaveProgress(null);
    } finally {
      setSavingPlaylist(false);
    }
  }, [
    accessToken,
    allSongs,
    connectSpotify,
    disconnectSpotify,
    fetchedUsername,
    isSpotifyConnected,
    savingPlaylist,
  ]);

  return (
    <div className="min-h-screen text-gray-200 relative overflow-x-hidden" style={{ background: "#080c14" }}>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full opacity-100"
          style={{ background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)" }} />
        <div className="absolute top-1/2 -right-32 w-[480px] h-[480px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-20 left-1/4 w-[420px] h-[420px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 70%)" }} />
      </div>

      <Navbar />

      <div className="relative container mx-auto py-12 px-4 max-w-7xl mb-28">

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FaMusic className="text-white text-[11px]" />
              </div>
              <span className="text-[11px] font-bold text-blue-400/80 tracking-[0.15em] uppercase">Anime Playlist</span>
            </div>
            {fetchedUsername ? (
              <>
                <h1 className="text-4xl font-bold text-white">{fetchedUsername}'s Playlist</h1>
                <p className="text-gray-600 text-sm mt-1.5">{allSongs.length} tracks Â· anime soundtracks</p>
              </>
            ) : (
              <h1 className="text-4xl font-bold text-white leading-[1.15]">
                Anime Soundtrack<br />
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                  Explorer
                </span>
              </h1>
            )}
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto">
            {isSpotifyConnected && (
              <div className="self-start sm:self-end flex items-center gap-2">
                <SpotifyUserPill user={spotifyUser} onDisconnect={disconnectSpotify} />
                {fetchedUsername && allSongs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveToSpotify}
                    disabled={savingPlaylist}
                    className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaSpotify className="text-sm" />
                    {savingPlaylist ? "Saving..." : "Save to Spotify"}
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04]
                px-3.5 py-2.5 focus-within:border-blue-500/40 focus-within:bg-white/[0.06] transition-all min-w-[180px]">
                <FaSearch className="text-gray-600 text-xs shrink-0" />
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onFocus={() => {
                    if (userSuggestions.length) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && fetchPlaylist(inputUsername)}
                  placeholder="Enter usernameâ€¦"
                  className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
                />
              </div>
              <button
                onClick={() => fetchPlaylist(inputUsername)}
                disabled={loading || !inputUsername.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-blue-600 hover:bg-blue-500 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all shadow-lg shadow-blue-600/15"
              >
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Loading</span>
                  : "Search"
                }
              </button>
            </div>
            {showSuggestions && userSuggestions.length > 0 && (
              <div ref={suggestionBoxRef} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c121d] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                {userSuggestions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setInputUsername(user.username);
                      fetchPlaylist(user.username);
                    }}
                    className="flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition hover:bg-white/[0.05] last:border-b-0"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-300">
                        {user.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{user.username}</p>
                      <p className="text-[11px] text-gray-500">Has anime playlist data</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {playlistSaveMessage && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  playlistSaveMessage.type === "success"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/20 bg-red-500/10 text-red-200"
                }`}
              >
                <span>{playlistSaveMessage.text}</span>
                {playlistSaveMessage.playlistUrl && (
                  <a
                    href={playlistSaveMessage.playlistUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 font-medium text-white underline underline-offset-2"
                  >
                    Open playlist
                  </a>
                )}
              </div>
            )}
            {savingPlaylist && saveProgress && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-blue-100">{saveProgress.message}</span>
                  <span className="text-blue-200">{Math.max(0, Math.min(100, saveProgress.percent))}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, saveProgress.percent))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {!isSpotifyConnected && <SpotifyConnectBanner onConnect={connectSpotify} />}

        {error && (
          <div role="alert" className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-5 py-3.5 text-sm">
            <span>âš </span> {error}
          </div>
        )}

        {loading && !fetchedUsername && <SkeletonGrid />}

        {!fetchedUsername && !loading && <EmptyHero />}

        {fetchedUsername && (
          <>
            <StatsBar allSongs={allSongs} />

            <FilterBar
              searchQuery={searchQuery} onSearch={setSearchQuery}
              searchMode={searchMode}   onSearchMode={setSearchMode}
              statusFilter={statusFilter} onStatus={setStatusFilter}
              sortBy={sortBy} onSort={() => setSortBy(s => s === "name" ? "anime" : "name")}
            />

            {displayedSongs.length === 0 && !loading ? (
              <div className="flex flex-col items-center py-20 text-center">
                <span className="text-4xl mb-4">ðŸŽµ</span>
                <p className="text-gray-400 font-medium">No songs match your filters</p>
                <p className="text-gray-600 text-sm mt-1">Try adjusting the search or status filter</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {displayedSongs.map((song, index) => (
                  <SongCard
                    key={song.id ?? `${song.name}-${index}`}
                    song={song}
                    index={index}
                    isCurrent={index === currentTrackIndex}
                    canPlay={isSpotifyConnected}
                    onPlay={() => handlePlay(index, song)}
                  />
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2.5 mt-10 text-gray-600 text-sm">
                <span className="w-3.5 h-3.5 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                Loading more tracksâ€¦
              </div>
            )}

            {!loading && !hasMore && displayedSongs.length > 0 && (
              <div className="mt-14 flex flex-col items-center gap-2">
                <div className="w-24 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }} />
                <p className="text-gray-700 text-xs">{displayedSongs.length} tracks Â· end of playlist</p>
              </div>
            )}

            <div ref={observerRef} className="h-4" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}
