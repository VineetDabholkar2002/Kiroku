import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import { FaSortAlphaDown, FaSortAlphaUp, FaSearch, FaSpotify, FaMusic, FaCopy, FaPlus } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import { useSpotify } from "../context/SpotifyContext";
import SongCard from "../components/soundtracks/SongCard";
import SpotifyConnectBanner from "../components/soundtracks/SpotifyConnectBanner";
import ExportSongsModal from "../components/soundtracks/ExportSongsModal";
import SearchAndAddSongsModal from "../components/soundtracks/SearchAndAddSongsModal";
import CreatePlaylistModal from "../components/soundtracks/CreatePlaylistModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: "all",         label: "All",           gradient: "from-slate-500 to-slate-600" },
  { key: "completed",   label: "Completed",     gradient: "from-emerald-500 to-teal-600" },
  { key: "plantowatch", label: "Plan to Watch", gradient: "from-violet-500 to-purple-600" },
  { key: "watching",    label: "Watching",      gradient: "from-rose-500 to-pink-600" },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyFiltersAndSort(songs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy }) {
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
      const matchesAnime =
        !animeFilter || s.animeTitle?.toLowerCase() === animeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesAnime;
    })
    .sort((a, b) => {
      const valA = (sortBy === "name" ? a.name : a.animeTitle) ?? "";
      const valB = (sortBy === "name" ? b.name : b.animeTitle) ?? "";
      return valA.localeCompare(valB);
    });
}

// ─── SpotifyUserPill ──────────────────────────────────────────────────────────

function SpotifyUserPill({ user, onDisconnect }) {
  return (
    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
      {user?.images?.[0]?.url
        ? <img src={user.images[0].url} alt="" className="w-5 h-5 rounded-full" />
        : <FaSpotify className="text-emerald-400 text-xs" />
      }
      <span className="text-emerald-300 font-medium text-xs">{user?.display_name ?? "Connected"}</span>
      <button onClick={onDisconnect} className="text-gray-600 hover:text-red-400 transition-colors text-xs ml-0.5" aria-label="Disconnect Spotify">✕</button>
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

function StatsBar({ allSongs }) {
  const stats = [
    { label: "Total",        value: allSongs.length,                                                                                     color: "text-white" },
    { label: "Completed",    value: allSongs.filter(s => s.status?.toLowerCase().replace(/\s+/g,"") === "completed").length,   color: "text-emerald-400" },
    { label: "Watching",     value: allSongs.filter(s => s.status?.toLowerCase().replace(/\s+/g,"") === "watching").length,    color: "text-rose-400" },
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

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  searchQuery,
  onSearch,
  searchMode,
  onSearchMode,
  statusFilter,
  onStatus,
  animeFilter,
  onAnimeFilter,
  availableAnimes,
  sortBy,
  onSort,
}) {
  const placeholder =
    searchMode === "song"  ? "Search by song name…" :
    searchMode === "anime" ? "Search by anime title…" :
                             "Search songs & anime…";
  return (
    <div className="mb-7 space-y-3">
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="flex flex-1 min-w-[220px] items-center rounded-xl border border-white/[0.08] bg-white/[0.04]
          focus-within:border-rose-500/40 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(244,63,94,0.08)]
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
                  ${searchMode === m.key ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30" : "text-gray-400 hover:text-white hover:bg-white/[0.08]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anime Filter Selector (from user list) */}
        {availableAnimes && availableAnimes.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs">
            <span className="text-gray-400 font-medium shrink-0">Anime:</span>
            <select
              value={animeFilter}
              onChange={(e) => onAnimeFilter(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[190px] truncate"
            >
              <option value="" className="bg-[#0f172a] text-gray-400">
                All Animes ({availableAnimes.length})
              </option>
              {availableAnimes.map((a) => (
                <option key={a.title} value={a.title} className="bg-[#0f172a] text-white">
                  {a.title} ({a.count})
                </option>
              ))}
            </select>
            {animeFilter && (
              <button
                type="button"
                onClick={() => onAnimeFilter("")}
                className="text-gray-400 hover:text-white ml-1 text-xs"
                title="Clear anime filter"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Sort */}
        <button onClick={onSort}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold
            bg-white/[0.04] border border-white/[0.08] text-gray-400
            hover:bg-white/[0.08] hover:text-white hover:border-white/15 active:scale-95 transition-all"
        >
          {sortBy === "name" ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
          {sortBy === "name" ? "Song" : "Anime"}
        </button>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap items-center">
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

        {animeFilter && (
          <span className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300">
            <span>Filtered: <strong>{animeFilter}</strong></span>
            <button
              onClick={() => onAnimeFilter("")}
              className="text-rose-400 hover:text-white ml-1"
            >
              ✕
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyHero() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/15 to-pink-500/15 border border-white/[0.08] flex items-center justify-center p-3 shadow-xl shadow-rose-500/10">
          <img src="/logo.png" alt="Kiroku" className="w-full h-full rounded-2xl object-cover ring-1 ring-white/10" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-rose-500/10 blur-xl" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Discover an Anime Playlist</h2>
      <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
        Enter a username above to explore their full anime soundtrack collection.
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlaylistMaker() {
  const {
    setPlaylist, currentTrack, playTrackAtIndex,
    isSpotifyConnected, accessToken, spotifyUser,
    connectSpotify, disconnectSpotify,
    authLoading, authError,
  } = useSpotify();

  const [allSongs, setAllSongs]               = useState([]);
  const [displayedSongs, setDisplayedSongs]   = useState([]);
  const [hasMore, setHasMore]                 = useState(false);
  const [inputUsername, setInputUsername]     = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [animeUsername, setAnimeUsername]     = useState(""); // The MAL/Kiroku username
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchMode, setSearchMode]           = useState("both");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [animeFilter, setAnimeFilter]         = useState("");
  const [sortBy, setSortBy]                   = useState("name");
  const [savingPlaylist, setSavingPlaylist]   = useState(false);
  const [playlistSaveMessage, setPlaylistSaveMessage] = useState(null);
  const [saveProgress, setSaveProgress]       = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [showSearchAddModal, setShowSearchAddModal] = useState(false);
  const [showSaveModal, setShowSaveModal]           = useState(false);
  const [isCreatingMainPlaylist, setIsCreatingMainPlaylist] = useState(false);
  const [newMainPlaylistName, setNewMainPlaylistName] = useState("");
  const [creatingMainPlaylistLoading, setCreatingMainPlaylistLoading] = useState(false);
  const [userSpotifyPlaylists, setUserSpotifyPlaylists] = useState([]);
  const [activeSpotifyPlaylist, setActiveSpotifyPlaylist] = useState(null);
  const [_loadingSpotifyPlaylists, setLoadingSpotifyPlaylists] = useState(false);
  const observerRef = useRef(null);
  const suggestionBoxRef = useRef(null);

  const hasPlaylistContent = !!activeSpotifyPlaylist || !!animeUsername;

  // Compute unique anime list from allSongs for the anime filter
  const availableAnimes = useMemo(() => {
    const map = new Map();
    for (const s of allSongs) {
      if (!s.animeTitle) continue;
      map.set(s.animeTitle, (map.get(s.animeTitle) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allSongs]);

  // Load user's Spotify playlists when connected
  useEffect(() => {
    if (!isSpotifyConnected || !accessToken) {
      setUserSpotifyPlaylists([]);
      return;
    }

    setLoadingSpotifyPlaylists(true);
    api
      .get("/api/v1/spotify/user-playlists", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data }) => {
        setUserSpotifyPlaylists(data || []);
      })
      .catch((err) => {
        console.error("Failed to load user Spotify playlists:", err);
      })
      .finally(() => {
        setLoadingSpotifyPlaylists(false);
      });
  }, [isSpotifyConnected, accessToken]);

  const openSpotifyPlaylist = useCallback(async (playlist) => {
    if (!playlist || !accessToken) return;
    setLoading(true);
    setError(null);
    setPlaylistSaveMessage(null);
    setAnimeFilter("");
    try {
      const { data } = await api.get(`/api/v1/spotify/playlist/${playlist.id}/tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const formattedSongs = (data.tracks || []).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        animeTitle: playlist.name,
        image: t.imageUrl,
        uri: t.uri,
        status: "Spotify",
      }));
      setAllSongs(formattedSongs);
      setDisplayedSongs(formattedSongs.slice(0, PAGE_SIZE));
      setHasMore(formattedSongs.length > PAGE_SIZE);
      setActiveSpotifyPlaylist(playlist);
      // NOTE: Do not overwrite animeUsername here, so user anime list stays preserved!
      setPlaylist(formattedSongs);
    } catch {
      setError(`Could not load tracks for "${playlist.name}".`);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setPlaylist]);

  const handleTracksAdded = useCallback(({ playlistId, newTracks, addedCount, isDraft, draftPlaylist }) => {
    if (draftPlaylist) {
      setUserSpotifyPlaylists((prev) => [
        draftPlaylist,
        ...prev.filter((p) => p.id !== draftPlaylist.id),
      ]);
      setActiveSpotifyPlaylist(draftPlaylist);
      setAllSongs([]);
      setDisplayedSongs([]);
      setHasMore(false);
      setPlaylist([]);
      return;
    }

    if (addedCount > 0 && newTracks && newTracks.length > 0) {
      const formatted = newTracks.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        animeTitle: t.animeTitle || activeSpotifyPlaylist?.name || animeUsername || "Soundtrack",
        image: t.imageUrl || t.image,
        uri: t.uri,
        status: isDraft ? "Draft" : "Added",
      }));

      setAllSongs((prev) => {
        const existingKeys = new Set(
          prev.map((s) => s.uri || `${s.name}-${s.artist}`)
        );
        const toAppend = formatted.filter(
          (f) => !existingKeys.has(f.uri || `${f.name}-${f.artist}`)
        );
        const nextAll = [...prev, ...toAppend];
        setPlaylist(nextAll);
        return nextAll;
      });

      // Update total tracks count in playlist selector for both draft and regular playlists
      if (playlistId) {
        setUserSpotifyPlaylists((prev) =>
          prev.map((pl) =>
            pl.id === playlistId
              ? { ...pl, totalTracks: (pl.totalTracks || 0) + addedCount }
              : pl
          )
        );
      }
    }

    setPlaylistSaveMessage({
      type: isDraft ? "info" : "success",
      text: isDraft
        ? `Added ${addedCount} song(s) to draft "${activeSpotifyPlaylist?.name || "playlist"}". When ready, click "Create on Spotify"!`
        : `Added ${addedCount} song(s) to Spotify playlist.`,
      playlistUrl: null,
    });
  }, [activeSpotifyPlaylist, animeUsername, setPlaylist]);

  const handleMainCreatePlaylist = (e) => {
    e?.preventDefault();
    const trimmed = newMainPlaylistName.trim();
    if (!trimmed) return;

    // Create a local draft playlist and keep in user playlist dropdown
    const newDraft = {
      id: `draft_${Date.now()}`,
      name: trimmed,
      isDraft: true,
      totalTracks: 0,
    };

    setUserSpotifyPlaylists((prev) => [
      newDraft,
      ...prev.filter((p) => p.id !== newDraft.id),
    ]);
    setActiveSpotifyPlaylist(newDraft);
    setAllSongs([]);
    setDisplayedSongs([]);
    setHasMore(false);
    setIsCreatingMainPlaylist(false);
    setNewMainPlaylistName("");

    setPlaylistSaveMessage({
      type: "info",
      text: `Draft playlist "${trimmed}" started! Click "Discover & Add Songs" to add tracks, then click "Create on Spotify".`,
      playlistUrl: null,
    });
  };

  const fetchPlaylist = useCallback(async (username) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setError(null); setLoading(true);
    setAllSongs([]); setDisplayedSongs([]);
    setHasMore(false);
    setAnimeUsername(trimmed);
    setActiveSpotifyPlaylist(null);
    setPlaylistSaveMessage(null);
    setSaveProgress(null);
    setAnimeFilter("");
    setShowSuggestions(false);
    try {
      const { data } = await api.get(`/api/v1/playlist/${trimmed}`);
      setAllSongs(data);
      setDisplayedSongs(data.slice(0, PAGE_SIZE));
      setHasMore(data.length > PAGE_SIZE);
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
        const { data } = await api.get("/api/v1/playlist/suggest-users", {
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
    if (!allSongs.length) {
      setDisplayedSongs([]);
      setHasMore(false);
      return;
    }
    const filtered = applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy });
    setDisplayedSongs(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }, [allSongs, searchQuery, searchMode, statusFilter, animeFilter, sortBy]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const filtered = applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy });
    const nextEnd = displayedSongs.length + PAGE_SIZE;
    setDisplayedSongs(filtered.slice(0, nextEnd));
    setHasMore(filtered.length > nextEnd);
  }, [loading, hasMore, allSongs, searchQuery, searchMode, statusFilter, animeFilter, sortBy, displayedSongs.length]);

  useEffect(() => {
    const target = observerRef.current;
    if (!target || !hasPlaylistContent) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: "300px" });
    obs.observe(target);
    return () => obs.unobserve(target);
  }, [loadMore, hasPlaylistContent]);

  const handlePlay = useCallback(async (song) => {
    try {
      const { data } = await api.get("/api/v1/spotify/song", {
        params: { name: song.name, artist: Array.isArray(song.artist) ? song.artist[0] : song.artist },
      });
      if (data?.tracks?.length > 0) {
        const realIndex = allSongs.findIndex(
          (s) => s.name === song.name && s.animeTitle === song.animeTitle
        );
        playTrackAtIndex(realIndex >= 0 ? realIndex : 0, data.tracks[0]);
      } else {
        alert("Song not found on Spotify.");
      }
    } catch {
      alert("Spotify search failed. Please try again.");
    }
  }, [allSongs, playTrackAtIndex]);

  const handleExportText = useCallback(() => {
    if (allSongs.length === 0) return;
    setShowExportModal(true);
  }, [allSongs]);

  const confirmExport = useCallback(() => {
    const textList = allSongs
      .map((song) => `${song.name} - ${song.artist} (${song.animeTitle})`)
      .join("\n");
      
    navigator.clipboard.writeText(textList)
      .then(() => {
        setShowExportModal(false);
        window.open("https://www.tunemymusic.com/transfer", "_blank");
      })
      .catch(() => alert("Failed to copy playlist to clipboard."));
  }, [allSongs]);

  const handleSaveToSpotify = useCallback(async (customName, customDescription, customSongs = null) => {
    const candidateSongs = customSongs || ((animeFilter || statusFilter !== "all" || searchQuery)
      ? applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy })
      : allSongs);

    if (!hasPlaylistContent || candidateSongs.length === 0 || savingPlaylist) return;
    if (!isSpotifyConnected) {
      connectSpotify();
      return;
    }

    setSavingPlaylist(true);
    setPlaylistSaveMessage(null);
    setSaveProgress({ percent: 0, message: "Creating Spotify playlist..." });

    const songsToSave = candidateSongs;

    const defaultTitle = activeSpotifyPlaylist?.name || (animeUsername ? `${animeUsername}'s Anime Playlist` : "My Anime Playlist");
    const finalName = customName || defaultTitle;
    const finalDescription = customDescription || `Created by Kiroku from ${animeUsername || "anime"} soundtrack results.`;

    try {
      const response = await fetch("/api/v1/spotify/playlist-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: finalName,
          description: finalDescription,
          songs: songsToSave.map((song) => ({
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
            const createdId = payload.playlistId || payload.PlaylistId;
            const createdUrl = payload.playlistUrl || payload.PlaylistUrl;
            const newlyCreated = {
              id: createdId || `spotify_${Date.now()}`,
              name: finalName,
              description: finalDescription,
              totalTracks: payload.addedCount ?? songsToSave.length,
              externalUrl: createdUrl,
              isDraft: false,
            };

            setUserSpotifyPlaylists((prev) => [
              newlyCreated,
              ...prev.filter((p) => p.id !== newlyCreated.id && p.id !== activeSpotifyPlaylist?.id),
            ]);
            setActiveSpotifyPlaylist(newlyCreated);

            // Re-sync with Spotify API in background to keep list fresh
            setTimeout(() => {
              if (accessToken) {
                api
                  .get("/api/v1/spotify/user-playlists", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  })
                  .then(({ data }) => {
                    if (data && Array.isArray(data)) {
                      setUserSpotifyPlaylists((prev) => {
                        const drafts = prev.filter((p) => p.isDraft);
                        const hasNew = data.some((d) => d.id === newlyCreated.id);
                        const merged = hasNew ? data : [newlyCreated, ...data];
                        return [...drafts, ...merged];
                      });
                    }
                  })
                  .catch(() => {});
              }
            }, 1200);

            setPlaylistSaveMessage({
              type: "success",
              text: createdUrl
                ? `✓ Successfully created playlist "${finalName}" on Spotify with ${payload.addedCount ?? songsToSave.length} tracks!`
                : payload?.message ?? "Playlist created on Spotify.",
              playlistUrl: createdUrl ?? null,
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
    activeSpotifyPlaylist,
    allSongs,
    animeFilter,
    animeUsername,
    hasPlaylistContent,
    statusFilter,
    searchQuery,
    searchMode,
    sortBy,
    connectSpotify,
    disconnectSpotify,
    isSpotifyConnected,
    savingPlaylist,
  ]);

  return (
    <div className="min-h-screen text-gray-200 relative overflow-x-hidden" style={{ background: "#080c14" }}>

      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full opacity-100"
          style={{ background: "radial-gradient(circle,rgba(244,63,94,0.07) 0%,transparent 70%)" }} />
        <div className="absolute top-1/2 -right-32 w-[480px] h-[480px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-20 left-1/4 w-[420px] h-[420px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 70%)" }} />
      </div>

      <div className="relative container mx-auto py-12 px-4 max-w-7xl mb-28">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/logo.png" alt="Kiroku" className="w-7 h-7 rounded-lg shadow-md shadow-rose-500/20 ring-1 ring-white/10 object-cover" />
              <span className="text-[11px] font-bold text-rose-400/90 tracking-[0.15em] uppercase">Anime Playlist</span>
            </div>
            {activeSpotifyPlaylist ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <FaSpotify className={activeSpotifyPlaylist.isDraft ? "text-amber-400 text-sm" : "text-emerald-400 text-sm"} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSpotifyPlaylist.isDraft ? "text-amber-400" : "text-emerald-400"}`}>
                    {activeSpotifyPlaylist.isDraft ? "Draft Playlist (Not Saved to Spotify Yet)" : "Spotify Playlist"}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">{activeSpotifyPlaylist.name}</h1>
                <p className="text-gray-400 text-sm mt-1.5">
                  {allSongs.length} track{allSongs.length === 1 ? "" : "s"} {activeSpotifyPlaylist.isDraft ? "· Add songs, then click Create on Spotify" : "loaded from Spotify"}
                </p>
              </>
            ) : animeUsername ? (
              <>
                <h1 className="text-4xl font-bold text-white">{animeUsername}'s Playlist</h1>
                <p className="text-gray-400 text-sm mt-1.5">{allSongs.length} tracks · anime soundtracks</p>
              </>
            ) : (
              <h1 className="text-4xl font-bold text-white leading-[1.15]">
                Anime Soundtrack<br />
                <span className="bg-gradient-to-r from-rose-400 via-pink-300 to-rose-200 bg-clip-text text-transparent">
                  Explorer
                </span>
              </h1>
            )}
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto">
            <div className="self-start sm:self-end flex flex-wrap items-center gap-2">
              {isSpotifyConnected && <SpotifyUserPill user={spotifyUser} onDisconnect={disconnectSpotify} />}

              {/* Discover & Add Songs Button */}
              <button
                type="button"
                onClick={() => setShowSearchAddModal(true)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 px-4 py-2 text-xs font-semibold text-white transition active:scale-95 shadow-md shadow-rose-500/25"
              >
                <FaSearch className="text-[11px]" />
                Discover & Add Songs
              </button>
              
              {hasPlaylistContent && allSongs.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportText}
                    className="flex items-center gap-2 rounded-full bg-gray-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-600"
                  >
                    <FaCopy className="text-sm" />
                    Copy as Text
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSpotifyConnected) {
                        connectSpotify();
                      } else {
                        setShowSaveModal(true);
                      }
                    }}
                    disabled={savingPlaylist}
                    className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-emerald-500/20"
                  >
                    <FaSpotify className="text-sm" />
                    {savingPlaylist
                      ? "Creating on Spotify..."
                      : activeSpotifyPlaylist?.isDraft
                      ? `Create on Spotify (${allSongs.length})`
                      : "Save to Spotify"}
                  </button>
                </>
              )}
            </div>

            {/* Quick Selector for Existing Spotify Playlists + New Playlist Button */}
            {isSpotifyConnected && (
              <div className="flex items-center gap-2 w-full">
                {isCreatingMainPlaylist ? (
                  <form
                    onSubmit={handleMainCreatePlaylist}
                    className="flex flex-1 items-center gap-2 rounded-xl border border-emerald-500/50 bg-white/[0.06] px-3.5 py-2 animate-fade-in"
                  >
                    <FaSpotify className="text-emerald-400 text-xs shrink-0" />
                    <input
                      type="text"
                      value={newMainPlaylistName}
                      onChange={(e) => setNewMainPlaylistName(e.target.value)}
                      placeholder="Enter new playlist name..."
                      autoFocus
                      className="bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none flex-1"
                    />
                    <button
                      type="submit"
                      disabled={!newMainPlaylistName.trim()}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition disabled:opacity-40"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingMainPlaylist(false);
                        setNewMainPlaylistName("");
                      }}
                      className="text-gray-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2">
                      <FaSpotify className="text-emerald-400 text-xs shrink-0" />
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0 hidden sm:inline">
                        Playlist:
                      </span>
                      <select
                        value={activeSpotifyPlaylist?.id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__create_new__") {
                            setIsCreatingMainPlaylist(true);
                          } else {
                            const pl = userSpotifyPlaylists.find((p) => p.id === val);
                            if (pl) {
                              if (pl.isDraft) {
                                setActiveSpotifyPlaylist(pl);
                              } else {
                                openSpotifyPlaylist(pl);
                              }
                            }
                          }
                        }}
                        className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer w-full truncate"
                      >
                        <option value="" className="bg-[#0f172a] text-gray-400">
                          -- Select an existing playlist --
                        </option>
                        {userSpotifyPlaylists.map((pl) => (
                          <option
                            key={pl.id}
                            value={pl.id}
                            className={`bg-[#0f172a] ${pl.isDraft ? "text-amber-300 font-semibold" : "text-white"}`}
                          >
                            {pl.isDraft
                              ? `⭐ [Draft] ${pl.name} (${pl.totalTracks || 0} tracks)`
                              : `${pl.name} (${pl.totalTracks || 0} tracks)`}
                          </option>
                        ))}
                        <option value="__create_new__" className="bg-[#0f172a] text-emerald-400 font-bold">
                          + Create New Playlist...
                        </option>
                      </select>
                    </div>

                    {/* + New Playlist Button */}
                    <button
                      type="button"
                      onClick={() => setIsCreatingMainPlaylist(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition active:scale-95 shrink-0"
                      title="Start a new draft playlist"
                    >
                      <FaPlus className="text-[10px]" />
                      <span>New Playlist</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Username Search Bar */}
            <div className="flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04]
                px-3.5 py-2.5 focus-within:border-rose-500/40 focus-within:bg-white/[0.06] transition-all min-w-[180px]">
                <FaSearch className="text-gray-600 text-xs shrink-0" />
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  onFocus={() => {
                    if (userSuggestions.length) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && fetchPlaylist(inputUsername)}
                  placeholder="Enter username…"
                  className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full"
                />
              </div>
              <button
                onClick={() => fetchPlaylist(inputUsername)}
                disabled={loading || !inputUsername.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 active:scale-95
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all shadow-lg shadow-rose-500/25"
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 text-xs font-bold text-rose-300">
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
                    : playlistSaveMessage.type === "info"
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
                    : playlistSaveMessage.type === "warning"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
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
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-rose-100">{saveProgress.message}</span>
                  <span className="text-rose-200">{Math.max(0, Math.min(100, saveProgress.percent))}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, saveProgress.percent))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spotify banner */}
        {!isSpotifyConnected && (
          <SpotifyConnectBanner
            onConnect={connectSpotify}
            isLoading={authLoading}
            error={authError}
          />
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-5 py-3.5 text-sm">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !hasPlaylistContent && <SkeletonGrid />}

        {/* Empty hero */}
        {!hasPlaylistContent && !loading && <EmptyHero />}

        {/* Playlist */}
        {hasPlaylistContent && (
          <>
            <StatsBar allSongs={allSongs} />

            <FilterBar
              searchQuery={searchQuery} onSearch={setSearchQuery}
              searchMode={searchMode}   onSearchMode={setSearchMode}
              statusFilter={statusFilter} onStatus={setStatusFilter}
              animeFilter={animeFilter} onAnimeFilter={setAnimeFilter}
              availableAnimes={availableAnimes}
              sortBy={sortBy} onSort={() => setSortBy(s => s === "name" ? "anime" : "name")}
            />

            {displayedSongs.length === 0 && !loading ? (
              <div className="flex flex-col items-center py-20 text-center">
                <span className="text-4xl mb-4">{activeSpotifyPlaylist?.isDraft ? "✨" : "🎵"}</span>
                <p className="text-gray-200 font-semibold text-lg">
                  {activeSpotifyPlaylist?.isDraft
                    ? `"${activeSpotifyPlaylist.name}" is ready for songs!`
                    : "No songs match your filters"}
                </p>
                <p className="text-gray-500 text-sm mt-1 max-w-md">
                  {activeSpotifyPlaylist?.isDraft
                    ? "Add anime opening & ending themes or search Spotify tracks to fill this playlist, then create it on Spotify."
                    : "Try adjusting the search, anime, or status filter"}
                </p>
                {activeSpotifyPlaylist?.isDraft && (
                  <button
                    type="button"
                    onClick={() => setShowSearchAddModal(true)}
                    className="mt-5 flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-500/25 transition active:scale-95"
                  >
                    <FaPlus className="text-xs" />
                    Discover & Add Songs Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {displayedSongs.map((song, index) => (
                  <SongCard
                    key={`${song.id || song.uri || song.name}-${song.animeTitle || ""}-${index}`}
                    song={song}
                    index={index}
                    isCurrent={currentTrack?.name === song.name && currentTrack?.animeTitle === song.animeTitle}
                    canPlay={true}
                    onPlay={() => handlePlay(song)}
                  />
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2.5 mt-10 text-gray-600 text-sm">
                <span className="w-3.5 h-3.5 border-2 border-gray-700 border-t-rose-500 rounded-full animate-spin" />
                Loading more tracks…
              </div>
            )}

            {!loading && !hasMore && displayedSongs.length > 0 && (
              <div className="mt-14 flex flex-col items-center gap-2">
                <div className="w-24 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)" }} />
                <p className="text-gray-700 text-xs">{displayedSongs.length} tracks · end of playlist</p>
              </div>
            )}

            <div ref={observerRef} className="h-4" aria-hidden />
          </>
        )}
        
        {/* Export to text modal */}
        <ExportSongsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={confirmExport}
        />

        {/* Discover & Add Songs Modal */}
        <SearchAndAddSongsModal
          isOpen={showSearchAddModal}
          onClose={() => setShowSearchAddModal(false)}
          currentUsername={animeUsername}
          initialPlaylist={activeSpotifyPlaylist ? {
            id: activeSpotifyPlaylist.id,
            name: activeSpotifyPlaylist.name,
            isSpotify: !activeSpotifyPlaylist.isDraft,
            isDraft: !!activeSpotifyPlaylist.isDraft,
            tracks: allSongs,
            userListUsername: animeUsername,
          } : (animeUsername ? {
            id: `draft_${Date.now()}`,
            name: `${animeUsername}'s Anime Playlist`,
            isDraft: true,
            tracks: allSongs,
            userListUsername: animeUsername,
          } : null)}
          userPlaylists={userSpotifyPlaylists}
          onTracksAdded={handleTracksAdded}
        />

        {/* Save Current Playlist to Spotify Modal (with song list preview & selection) */}
        <CreatePlaylistModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          defaultName={activeSpotifyPlaylist?.name || (animeUsername ? `${animeUsername}'s Anime Playlist` : "My Anime Playlist")}
          defaultDescription={`Created by Kiroku from ${animeUsername || "anime"} soundtrack results.`}
          songs={
            (animeFilter || statusFilter !== "all" || searchQuery)
              ? applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy })
              : allSongs
          }
          songCount={
            (animeFilter || statusFilter !== "all" || searchQuery)
              ? applyFiltersAndSort(allSongs, { searchQuery, searchMode, statusFilter, animeFilter, sortBy }).length
              : allSongs.length
          }
          onSaveWithTracks={async ({ name, description, songs: editedSongs }) => {
            await handleSaveToSpotify(name, description, editedSongs);
          }}
        />
      </div>
    </div>
  );
}
