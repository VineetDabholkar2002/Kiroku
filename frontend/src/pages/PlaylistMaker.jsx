import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Navbar from "../skeletons/Navbar";
import {
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSearch,
  FaPlay,
} from "react-icons/fa";
import { useSpotify } from "../context/SpotifyContext";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "plantowatch", label: "Plan to Watch" },
  { key: "watching", label: "Watching" },
];

const PAGE_SIZE = 20;

export default function PlaylistMaker() {
  const { setPlaylist, currentTrackIndex, playTrackAtIndex } = useSpotify();

  const [allSongs, setAllSongs] = useState([]);
  const [displayedSongs, setDisplayedSongs] = useState([]);
  const [inputUsername, setInputUsername] = useState("");
  const [fetchedUsername, setFetchedUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [error, setError] = useState(null);

  const observerRef = useRef(null);

  // Fetch playlist from backend
  const fetchPlaylist = useCallback(async (username) => {
    if (!username) return;
    setError(null);
    setLoading(true);
    setAllSongs([]);
    setDisplayedSongs([]);
    setHasMore(true);
    setFetchedUsername("");
    try {
      // Fetch directly from user playlist endpoint
      const { data } = await axios.get(`/api/v1/playlist/${username}`);
      setAllSongs(data);
      setDisplayedSongs(data.slice(0, PAGE_SIZE));
      setHasMore(data.length > PAGE_SIZE);
      setFetchedUsername(username);
      setPlaylist(data); // store in context for player
    } catch {
      setError(`Failed to load playlist for "${username}".`);
    } finally {
      setLoading(false);
    }
  }, [setPlaylist]);

  // Filter + sort helper
  const getFilteredSongs = useCallback(() => {
    return allSongs
      .filter((s) => {
        const matchesSearch =
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.anime?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          s.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) =>
        sortBy === "name"
          ? a.name.localeCompare(b.name)
          : a.anime.localeCompare(b.anime)
      );
  }, [allSongs, searchQuery, sortBy, statusFilter]);

  // Load next page
  const loadMore = useCallback(() => {
    if (loading || !hasMore || !allSongs.length) return;
    const filtered = getFilteredSongs();
    const nextBatch = filtered.slice(
      displayedSongs.length,
      displayedSongs.length + PAGE_SIZE
    );
    setDisplayedSongs((prev) => [...prev, ...nextBatch]);
    setHasMore(filtered.length > displayedSongs.length + PAGE_SIZE);
  }, [loading, hasMore, allSongs, displayedSongs, getFilteredSongs]);

  // Apply filter/sort
  useEffect(() => {
    if (!allSongs.length) return;
    const filtered = getFilteredSongs();
    setDisplayedSongs(filtered.slice(0, PAGE_SIZE));
    setHasMore(filtered.length > PAGE_SIZE);
  }, [searchQuery, sortBy, statusFilter, allSongs, getFilteredSongs]);

  // Infinite scroll effect
  useEffect(() => {
    const target = observerRef.current;
    if (!target || !fetchedUsername) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore();
    });
    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMore, fetchedUsername]);

  const onSort = () => setSortBy(sortBy === "name" ? "anime" : "name");

  // Fetch & play a song
  const fetchAndPlay = async (index, song) => {
    try {
      const { data } = await axios.get(
        `/api/v1/spotify/song?name=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}`
      );
      if (data?.tracks?.length > 0) {
        playTrackAtIndex(index, data.tracks[0]);
      } else {
        alert("Song not found on Spotify.");
      }
    } catch (err) {
      console.error(err);
      alert("Spotify search failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <Navbar />
      <div className="container mx-auto py-16 px-4 max-w-7xl mb-24">

        {/* Username Input */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between mb-12">
          <div className="text-center sm:text-left">
            <h1 className="text-5xl font-extrabold text-blue-400 mb-2">
              Anime Playlist
            </h1>
            {fetchedUsername ? (
              <>
                <p className="text-lg text-gray-400">Created by {fetchedUsername}</p>
                <p className="text-sm text-gray-500 mt-1">{allSongs.length} songs</p>
              </>
            ) : (
              <p className="text-lg text-gray-400">
                Enter a username to view their playlist
              </p>
            )}
          </div>
          <div className="mt-6 sm:mt-0 flex space-x-2 w-full md:w-auto">
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="Enter username..."
              className="flex-grow p-3 bg-gray-800 rounded-lg placeholder-gray-400"
              onKeyDown={(e) => e.key === "Enter" && fetchPlaylist(inputUsername)}
            />
            <button
              onClick={() => fetchPlaylist(inputUsername)}
              disabled={loading || !inputUsername}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FaSearch />
            </button>
          </div>
        </div>

        {error && <div className="bg-red-800 p-4 text-center mb-8">{error}</div>}

        {fetchedUsername && (
          <>
            {/* Filter + Sort Controls */}
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs or anime..."
                className="w-full md:w-1/3 p-3 bg-gray-800 rounded-lg"
              />

              {/* Status Filters */}
              <div className="flex space-x-2 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition
                      ${statusFilter === f.key ? "bg-green-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <button
                onClick={onSort}
                className="px-4 py-2 bg-gray-800 rounded-lg flex items-center space-x-2 hover:bg-gray-700"
              >
                <span>Sort by {sortBy === "name" ? "Name" : "Anime"}</span>
                {sortBy === "name" ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
              </button>
            </div>

            {/* Song Cards */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {displayedSongs.map((song, index) => (
                <SongCard
                  key={index}
                  song={song}
                  index={index}
                  isCurrent={index === currentTrackIndex}
                  onPlay={() => fetchAndPlay(index, song)}
                />
              ))}
            </div>

            {loading && <div className="mt-8 text-center">Loading more...</div>}
            {!loading && !hasMore && (
              <div className="mt-8 text-center text-gray-500">End of playlist.</div>
            )}
            <div ref={observerRef} className="h-4"></div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- SongCard ---------------- */
function SongCard({ song, isCurrent, onPlay }) {
  return (
    <div
      className={`group relative rounded-2xl overflow-hidden shadow-lg backdrop-blur-lg border transition transform hover:scale-[1.02]
        ${isCurrent ? "border-green-500" : "border-gray-700 hover:border-green-500"}`}
      title={song.name}
    >
      {/* Album Art */}
      <div className="relative overflow-hidden">
        <img
          src={song.image}
          alt={song.name}
          className="w-full h-56 object-cover transform group-hover:scale-110 transition duration-500"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-anime.jpg";
          }}
        />
        <button
          onClick={onPlay}
          className="absolute bottom-3 right-3 w-12 h-12 flex items-center justify-center rounded-full bg-green-500 shadow-lg hover:bg-green-600 opacity-0 group-hover:opacity-100 transition"
        >
          <FaPlay className="text-white text-lg ml-1" />
        </button>
      </div>
      {/* Text Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-lg truncate">{song.name}</h3>
        <p className="text-sm text-gray-300 truncate">
          {Array.isArray(song.artist) ? song.artist.join(", ") : song.artist}
        </p>
        <p className="text-xs text-gray-400 truncate mt-1">Anime: {song.anime}</p>
        {song.status && (
          <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">
            {song.status}
          </span>
        )}
      </div>
    </div>
  );
}
