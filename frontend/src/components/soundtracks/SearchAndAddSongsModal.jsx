import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../../services/api";
import { useSpotify } from "../../context/SpotifyContext";
import { useAuth } from "../../context/AuthContext";
import {
  FaSearch,
  FaSpotify,
  FaCheck,
  FaPlus,
  FaTimes,
  FaPlay,
  FaArrowLeft,
  FaMusic,
  FaListUl,
  FaUser,
  FaStar,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

function normalizeString(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatDuration(ms) {
  if (!ms) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isValidUsername(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  // Valid usernames don't have spaces, parentheses, quotes, or colons
  return /^[a-zA-Z0-9_.-]{1,30}$/.test(trimmed);
}

const USER_STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "watching", label: "Watching" },
  { key: "plantowatch", label: "Plan to Watch" },
  { key: "onhold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
];

export default function SearchAndAddSongsModal({
  isOpen,
  onClose,
  initialPlaylist = null,
  userPlaylists = [],
  onTracksAdded,
  currentUsername = "",
}) {
  const {
    isSpotifyConnected,
    accessToken,
    connectSpotify,
    playTrackAtIndex,
  } = useSpotify();

  const { username: authUsername } = useAuth();

  // Helper to resolve valid username (avoiding Spotify playlist titles)
  const resolveTargetUser = useCallback(
    (userCandidate) => {
      if (isValidUsername(userCandidate)) return userCandidate.trim();
      if (isValidUsername(authUsername)) return authUsername.trim();
      return "";
    },
    [authUsername]
  );

  const initialUser = resolveTargetUser(currentUsername || initialPlaylist?.userListUsername);

  // Search & Navigation States: "user-list" | "anime" | "song"
  const defaultMode = initialUser ? "user-list" : "anime";
  const [searchMode, setSearchMode] = useState(defaultMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // User Anime List States
  const [targetUsername, setTargetUsername] = useState(initialUser);
  const [inputUsername, setInputUsername] = useState(initialUser);
  const [userAnimeList, setUserAnimeList] = useState([]);
  const [loadingUserAnime, setLoadingUserAnime] = useState(false);
  const [userAnimeError, setUserAnimeError] = useState(null);
  const [userListStatusFilter, setUserListStatusFilter] = useState("all");

  // Global Anime Search (MAL) & Themes
  const [animeResults, setAnimeResults] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [animeSoundtracks, setAnimeSoundtracks] = useState([]);
  const [loadingSoundtracks, setLoadingSoundtracks] = useState(false);
  const [themeFilter, setThemeFilter] = useState("all"); // "all" | "opening" | "ending"

  // Song Search
  const [songResults, setSongResults] = useState([]);

  // Destination Playlists
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [_loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Inline Playlist Creation State
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylistLoading, setCreatingPlaylistLoading] = useState(false);

  // Selection & Adding
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addingSongKey, setAddingSongKey] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Whole Anime Selection & Batch Adding
  const [addingAnimeMap, setAddingAnimeMap] = useState({}); // malId -> 'loading' | 'done' | 'none'
  const [selectedAnimeIds, setSelectedAnimeIds] = useState(new Set());
  const [isBatchAddingAnime, setIsBatchAddingAnime] = useState(false);

  // Fetch anime list for a specific user
  const fetchUserAnimeList = useCallback(
    async (userToFetch) => {
      let cleanUser = (userToFetch || "").trim();
      if (!isValidUsername(cleanUser)) {
        if (authUsername && isValidUsername(authUsername)) {
          cleanUser = authUsername.trim();
        } else {
          setUserAnimeList([]);
          return;
        }
      }

      setLoadingUserAnime(true);
      setUserAnimeError(null);
      try {
        const { data } = await api.get(`/api/v1/user/by-username/${encodeURIComponent(cleanUser)}/anime-list`);
        setUserAnimeList(data || []);
        setTargetUsername(cleanUser);
        setInputUsername(cleanUser);
      } catch (err) {
        console.error("Failed to load user anime list:", err);
        setUserAnimeError(`Could not find anime list for user "${cleanUser}".`);
        setUserAnimeList([]);
      } finally {
        setLoadingUserAnime(false);
      }
    },
    [authUsername]
  );

  // Update target user when modal opens or valid currentUsername changes
  useEffect(() => {
    if (!isOpen) return;
    const resolved = resolveTargetUser(currentUsername);
    if (resolved && resolved !== targetUsername) {
      setTargetUsername(resolved);
      setInputUsername(resolved);
      fetchUserAnimeList(resolved);
    } else if (!targetUsername && authUsername) {
      setTargetUsername(authUsername);
      setInputUsername(authUsername);
      fetchUserAnimeList(authUsername);
    }
  }, [isOpen, currentUsername, authUsername, resolveTargetUser, targetUsername, fetchUserAnimeList]);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const initialPlaylistId = initialPlaylist?.id || null;
  const initialPlaylistName = initialPlaylist?.name || null;

  // Immediate sync when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialPlaylist?.id) {
      setSelectedPlaylistId(initialPlaylist.id);
      if (initialPlaylist.tracks) {
        setPlaylistTracks(initialPlaylist.tracks);
      }
    }
  }, [isOpen, initialPlaylist?.id]);

  // Load user's Spotify playlists once when modal opens and Spotify is connected
  useEffect(() => {
    if (!isOpen || !isSpotifyConnected || !accessToken) return;

    let mounted = true;
    setLoadingPlaylists(true);

    api
      .get("/api/v1/spotify/user-playlists", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data }) => {
        if (!mounted) return;
        const fetchedList = data || [];

        // Build list: Merge userPlaylists passed from parent with fetchedList
        let combined = [...fetchedList];
        if (Array.isArray(userPlaylists) && userPlaylists.length > 0) {
          for (const up of userPlaylists) {
            if (!combined.some((p) => p.id === up.id)) {
              combined.unshift(up);
            }
          }
        }

        if (initialPlaylist && initialPlaylist.id) {
          const exists = combined.some((p) => p.id === initialPlaylist.id);
          if (!exists) {
            combined.unshift({
              id: initialPlaylist.id,
              name: initialPlaylist.name,
              isDraft: !!initialPlaylist.isDraft,
              totalTracks: initialPlaylist.tracks?.length || 0,
            });
          }
        }

        setSpotifyPlaylists(combined);

        setSelectedPlaylistId((prevId) => {
          // 1. If prevId is set and valid in combined, keep it!
          if (prevId && combined.some((p) => p.id === prevId)) {
            return prevId;
          }
          // 2. If initialPlaylistId matches something in combined, use it!
          if (initialPlaylistId && combined.some((p) => p.id === initialPlaylistId)) {
            return initialPlaylistId;
          }
          // 3. Match by name
          if (initialPlaylistName) {
            const matchedByName = combined.find(
              (p) => normalizeString(p.name) === normalizeString(initialPlaylistName)
            );
            if (matchedByName) return matchedByName.id;
          }

          const chosen = combined[0];
          return chosen ? chosen.id : "";
        });
      })
      .catch((err) => {
        console.error("Failed to load user playlists:", err);
      })
      .finally(() => {
        if (mounted) setLoadingPlaylists(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, isSpotifyConnected, accessToken, initialPlaylistId, initialPlaylistName]);

  // Load tracks for the selected playlist
  useEffect(() => {
    if (!isOpen || !selectedPlaylistId) return;
    if (selectedPlaylistId === "__create_new__") return;

    // Check if it's a draft playlist:
    const targetPl = spotifyPlaylists.find((p) => p.id === selectedPlaylistId);
    if (targetPl?.isDraft || selectedPlaylistId.startsWith("draft_")) {
      if (initialPlaylist?.id === selectedPlaylistId && initialPlaylist?.tracks) {
        setPlaylistTracks(initialPlaylist.tracks);
      }
      return;
    }

    if (!accessToken) return;

    let mounted = true;
    setLoadingTracks(true);

    api
      .get(`/api/v1/spotify/playlist/${selectedPlaylistId}/tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data }) => {
        if (!mounted) return;
        setPlaylistTracks(data.tracks || []);
      })
      .catch((err) => {
        console.error("Failed to load playlist tracks:", err);
      })
      .finally(() => {
        if (mounted) setLoadingTracks(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, selectedPlaylistId, accessToken, initialPlaylist, spotifyPlaylists]);

  // Handle inline creation of a new draft playlist
  const handleInlineCreatePlaylist = (e) => {
    e?.preventDefault();
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;

    // Create draft playlist locally - do NOT call Spotify API yet!
    const newDraft = {
      id: `draft_${Date.now()}`,
      name: trimmed,
      isDraft: true,
      totalTracks: 0,
    };

    setSpotifyPlaylists((prev) => [newDraft, ...prev.filter((p) => p.id !== newDraft.id)]);
    setSelectedPlaylistId(newDraft.id);
    setPlaylistTracks([]);
    setIsCreatingInline(false);
    setNewPlaylistName("");

    setFeedbackMessage({
      type: "info",
      text: `Draft playlist "${trimmed}" started! Add your songs now, then save to Spotify.`,
    });

    if (onTracksAdded) {
      onTracksAdded({
        playlistId: newDraft.id,
        newTracks: [],
        addedCount: 0,
        isDraft: true,
        draftPlaylist: newDraft,
      });
    }
  };

  // Auto-fetch user anime list if entering user-list mode and targetUsername is set
  useEffect(() => {
    if (isOpen && searchMode === "user-list" && targetUsername && userAnimeList.length === 0) {
      fetchUserAnimeList(targetUsername);
    }
  }, [isOpen, searchMode, targetUsername, userAnimeList.length, fetchUserAnimeList]);

  // Execute Anime or Song search when debouncedQuery changes (for MAL or Spotify modes)
  useEffect(() => {
    if (searchMode === "user-list") return;

    if (!debouncedQuery) {
      setAnimeResults([]);
      setSongResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    if (searchMode === "anime") {
      api
        .get("/api/v1/anime/search", { params: { query: debouncedQuery, page: 1, per_page: 20 } })
        .then(({ data }) => {
          if (!active) return;
          setAnimeResults(data?.data || []);
        })
        .catch(() => {
          if (active) setAnimeResults([]);
        })
        .finally(() => {
          if (active) setIsSearching(false);
        });
    } else {
      api
        .get("/api/v1/spotify/search-tracks", {
          params: { query: debouncedQuery, limit: 25 },
        })
        .then(({ data }) => {
          if (!active) return;
          setSongResults(data?.tracks || []);
        })
        .catch(() => {
          if (active) setSongResults([]);
        })
        .finally(() => {
          if (active) setIsSearching(false);
        });
    }

    return () => {
      active = false;
    };
  }, [debouncedQuery, searchMode]);

  // Filtered User Anime List
  const filteredUserAnimeList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return userAnimeList.filter((item) => {
      const title = (item.animeTitle || item.title || "").toLowerCase();
      const matchesQuery = !q || title.includes(q);
      const rawStatus = (item.status || "").toLowerCase().replace(/[\s_-]+/g, "");
      const matchesStatus =
        userListStatusFilter === "all" ||
        rawStatus === userListStatusFilter.toLowerCase().replace(/[\s_-]+/g, "");
      return matchesQuery && matchesStatus;
    });
  }, [userAnimeList, searchQuery, userListStatusFilter]);

  // Check if a song/track is already in the destination playlist
  const isSongInPlaylist = useCallback(
    (song) => {
      if (!playlistTracks || playlistTracks.length === 0) return false;

      if (song.uri) {
        if (playlistTracks.some((t) => t.uri === song.uri)) return true;
      }

      const songNameNorm = normalizeString(song.name);
      const songArtistNorm = normalizeString(
        Array.isArray(song.artist) ? song.artist.join(" ") : song.artist || ""
      );

      if (!songNameNorm) return false;

      return playlistTracks.some((t) => {
        const trackNameNorm = normalizeString(t.name);
        const trackArtistNorm = normalizeString(t.artist);

        if (trackNameNorm === songNameNorm) {
          if (!songArtistNorm || !trackArtistNorm) return true;
          return (
            trackArtistNorm.includes(songArtistNorm) ||
            songArtistNorm.includes(trackArtistNorm)
          );
        }
        return false;
      });
    },
    [playlistTracks]
  );

  // Toggle anime checkbox selection
  const toggleSelectAnime = (malId) => {
    setSelectedAnimeIds((prev) => {
      const next = new Set(prev);
      if (next.has(malId)) {
        next.delete(malId);
      } else {
        next.add(malId);
      }
      return next;
    });
  };

  const handleToggleSelectAllAnime = (animeList) => {
    if (selectedAnimeIds.size >= animeList.length && animeList.length > 0) {
      setSelectedAnimeIds(new Set());
    } else {
      const allIds = new Set(
        animeList.map((a) => a.animeMalId ?? a.malId ?? a.MalId).filter(Boolean)
      );
      setSelectedAnimeIds(allIds);
    }
  };

  // Add all songs from an entire anime directly to destination playlist
  const handleAddAllAnimeSongs = async (anime, e) => {
    e?.stopPropagation();
    const malId = anime.animeMalId ?? anime.malId ?? anime.MalId;
    if (!malId) return;

    if (!selectedPlaylistId) {
      alert("Please select or start a destination playlist in the top-right first.");
      return;
    }

    const title = anime.animeTitle || anime.title || anime.Title || "this anime";
    setAddingAnimeMap((prev) => ({ ...prev, [malId]: "loading" }));

    try {
      const { data } = await api.get(`/api/v1/anime/${malId}/soundtracks`);
      const rawTracks = data || [];
      if (rawTracks.length === 0) {
        setAddingAnimeMap((prev) => ({ ...prev, [malId]: "none" }));
        setFeedbackMessage({
          type: "info",
          text: `No theme songs found for "${title}".`,
        });
        setTimeout(() => {
          setAddingAnimeMap((prev) => {
            const next = { ...prev };
            delete next[malId];
            return next;
          });
        }, 3000);
        return;
      }

      await handleAddSongs(rawTracks);
      setAddingAnimeMap((prev) => ({ ...prev, [malId]: "done" }));
      setTimeout(() => {
        setAddingAnimeMap((prev) => {
          const next = { ...prev };
          delete next[malId];
          return next;
        });
      }, 3500);
    } catch (err) {
      console.error("Failed to add anime soundtracks:", err);
      setAddingAnimeMap((prev) => ({ ...prev, [malId]: "error" }));
      setTimeout(() => {
        setAddingAnimeMap((prev) => {
          const next = { ...prev };
          delete next[malId];
          return next;
        });
      }, 3000);
    }
  };

  // Batch add all songs from multiple selected anime
  const handleAddBatchAnime = async () => {
    if (selectedAnimeIds.size === 0) return;
    if (!selectedPlaylistId) {
      alert("Please select or start a destination playlist in the top-right first.");
      return;
    }

    setIsBatchAddingAnime(true);
    const idList = Array.from(selectedAnimeIds);
    const allFetchedTracks = [];

    try {
      const results = await Promise.allSettled(
        idList.map((id) => api.get(`/api/v1/anime/${id}/soundtracks`))
      );

      for (const res of results) {
        if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
          allFetchedTracks.push(...res.value.data);
        }
      }

      if (allFetchedTracks.length > 0) {
        await handleAddSongs(allFetchedTracks);
        setSelectedAnimeIds(new Set());
        setFeedbackMessage({
          type: "success",
          text: `✓ Added ${allFetchedTracks.length} song(s) from ${idList.length} anime to your playlist!`,
        });
      } else {
        setFeedbackMessage({
          type: "info",
          text: `No theme songs found for the selected anime.`,
        });
      }
    } catch (err) {
      console.error("Batch add anime error:", err);
      setFeedbackMessage({
        type: "error",
        text: "Failed to add songs from selected anime.",
      });
    } finally {
      setIsBatchAddingAnime(false);
    }
  };

  // Handle clicking on an anime from either MAL search results or user list
  const handleSelectAnime = async (anime) => {
    setSelectedAnime(anime);
    setAnimeSoundtracks([]);
    setLoadingSoundtracks(true);
    setSelectedSongs([]);
    setFeedbackMessage(null);

    try {
      const malId = anime.malId ?? anime.MalId ?? anime.animeMalId ?? anime.AnimeMalId;
      const { data } = await api.get(`/api/v1/anime/${malId}/soundtracks`);
      setAnimeSoundtracks(data || []);
    } catch (err) {
      console.error("Failed to fetch anime soundtracks:", err);
      setAnimeSoundtracks([]);
    } finally {
      setLoadingSoundtracks(false);
    }
  };

  // Preview track playback
  const handlePreviewSong = async (song) => {
    try {
      if (song.uri) {
        playTrackAtIndex(0, song);
        return;
      }

      const { data } = await api.get("/api/v1/spotify/song", {
        params: {
          name: song.name,
          artist: Array.isArray(song.artist) ? song.artist[0] : song.artist,
        },
      });

      if (data?.tracks?.length > 0) {
        playTrackAtIndex(0, data.tracks[0]);
      } else {
        alert("Audio preview not available on Spotify for this track.");
      }
    } catch {
      alert("Failed to play track preview.");
    }
  };

  // Toggle selection for multiple items
  const toggleSelectSong = (song) => {
    if (isSongInPlaylist(song)) return;

    const key = song.uri || `${song.name}-${song.artist}-${song.animeTitle}`;
    setSelectedSongs((prev) => {
      const exists = prev.some(
        (s) => (s.uri || `${s.name}-${s.artist}-${s.animeTitle}`) === key
      );
      if (exists) {
        return prev.filter(
          (s) => (s.uri || `${s.name}-${s.artist}-${s.animeTitle}`) !== key
        );
      } else {
        return [...prev, song];
      }
    });
  };

  // Select/Deselect All available songs
  const handleToggleSelectAll = (availableSongs) => {
    const selectable = availableSongs.filter((s) => !isSongInPlaylist(s));
    if (selectable.length === 0) return;

    const allSelected = selectable.every((s) =>
      selectedSongs.some(
        (sel) =>
          (sel.uri || `${sel.name}-${sel.artist}`) ===
          (s.uri || `${s.name}-${s.artist}`)
      )
    );

    if (allSelected) {
      setSelectedSongs([]);
    } else {
      setSelectedSongs(selectable);
    }
  };

  // Add tracks to Spotify playlist or Draft playlist
  const handleAddSongs = async (songsToAdd) => {
    if (!selectedPlaylistId) {
      alert("Please select or create a destination playlist first.");
      return;
    }
    if (!songsToAdd || songsToAdd.length === 0) return;

    const targetPl = spotifyPlaylists.find((p) => p.id === selectedPlaylistId);
    const isDraft = targetPl?.isDraft || selectedPlaylistId.startsWith("draft_");
    const playlistName = targetPl?.name || "the playlist";

    const animeTitleStr =
      selectedAnime?.title ??
      selectedAnime?.Title ??
      selectedAnime?.animeTitle ??
      selectedAnime?.AnimeTitle ??
      "";

    const animeImgStr =
      selectedAnime?.animeImageUrl ||
      selectedAnime?.AnimeImageUrl ||
      (selectedAnime?.images || selectedAnime?.Images)?.[0]?.imageUrl ||
      "";

    const newItems = songsToAdd.map((s) => ({
      id: s.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: s.name,
      artist: Array.isArray(s.artist) ? s.artist.join(", ") : s.artist || "",
      uri: s.uri || "",
      imageUrl: s.imageUrl || s.image || s.animeImage || animeImgStr,
      animeTitle: s.animeTitle || animeTitleStr,
    }));

    // If draft playlist: DO NOT call Spotify yet!
    if (isDraft) {
      setPlaylistTracks((prev) => [...prev, ...newItems]);
      setSelectedSongs([]);

      // Update totalTracks count in the dropdown
      setSpotifyPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedPlaylistId
            ? { ...p, totalTracks: (p.totalTracks || 0) + newItems.length }
            : p
        )
      );

      setFeedbackMessage({
        type: "success",
        text: `✓ Added ${newItems.length} song(s) to draft "${playlistName}". Click "Create on Spotify" when ready!`,
      });

      if (onTracksAdded) {
        onTracksAdded({
          playlistId: selectedPlaylistId,
          newTracks: newItems,
          addedCount: newItems.length,
          isDraft: true,
        });
      }
      return;
    }

    if (!isSpotifyConnected) {
      connectSpotify();
      return;
    }

    setIsAdding(true);
    setFeedbackMessage(null);

    const uris = songsToAdd.filter((s) => s.uri).map((s) => s.uri);
    const unmappedSongs = songsToAdd
      .filter((s) => !s.uri)
      .map((s) => ({
        name: s.name,
        artist: Array.isArray(s.artist) ? s.artist.join(", ") : s.artist || "",
        animeTitle: s.animeTitle || animeTitleStr,
        image: s.image || s.animeImage || animeImgStr,
      }));

    try {
      const { data } = await api.post(
        `/api/v1/spotify/playlist/${selectedPlaylistId}/tracks`,
        { uris, songs: unmappedSongs },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (data?.success === false || data?.addedCount === 0) {
        setFeedbackMessage({
          type: "warning",
          text:
            data?.message ||
            "Could not find a match on Spotify for the selected songs.",
        });
        return;
      }

      const addedCount = data?.addedCount ?? songsToAdd.length;
      setFeedbackMessage({
        type: "success",
        text: data?.message || `✓ Added ${addedCount} song(s) to "${playlistName}".`,
      });

      setPlaylistTracks((prev) => [...prev, ...newItems]);
      setSelectedSongs([]);

      // Update totalTracks count in the dropdown
      setSpotifyPlaylists((prev) =>
        prev.map((p) =>
          p.id === selectedPlaylistId
            ? { ...p, totalTracks: (p.totalTracks || 0) + addedCount }
            : p
        )
      );

      if (onTracksAdded) {
        onTracksAdded({
          playlistId: selectedPlaylistId,
          newTracks: newItems,
          addedCount,
          isDraft: false,
        });
      }
    } catch (err) {
      console.error("Failed to add tracks to Spotify playlist:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to add songs to Spotify playlist. Please try again.";
      setFeedbackMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setIsAdding(false);
      setAddingSongKey(null);
    }
  };

  // Quick 1-click single song add
  const handleQuickAddSingle = async (song) => {
    const key = song.uri || `${song.name}-${song.artist}`;
    setAddingSongKey(key);
    await handleAddSongs([song]);
  };

  if (!isOpen) return null;

  const currentDestination = spotifyPlaylists.find(
    (p) => p.id === selectedPlaylistId
  );

  const filteredSoundtracks = animeSoundtracks.filter((song) => {
    if (themeFilter === "opening") return song.type?.toLowerCase() === "opening";
    if (themeFilter === "ending") return song.type?.toLowerCase() === "ending";
    return true;
  });

  // Selected Anime info resolver
  const selTitle =
    selectedAnime?.title ??
    selectedAnime?.Title ??
    selectedAnime?.animeTitle ??
    selectedAnime?.AnimeTitle ??
    "Untitled";

  const selScore =
    selectedAnime?.score ??
    selectedAnime?.Score ??
    selectedAnime?.animeScore ??
    selectedAnime?.AnimeScore;

  const selType =
    selectedAnime?.type ??
    selectedAnime?.Type ??
    selectedAnime?.animeType ??
    selectedAnime?.AnimeType;

  const selImg =
    selectedAnime?.animeImageUrl ||
    selectedAnime?.AnimeImageUrl ||
    (selectedAnime?.images || selectedAnime?.Images)?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.imageUrl ||
    (selectedAnime?.images || selectedAnime?.Images)?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
    (selectedAnime?.images || selectedAnime?.Images)?.[0]?.imageUrl ||
    "/placeholder-anime.jpg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/[0.12] bg-[#0c121e] text-gray-200 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden"
        style={{ background: "radial-gradient(circle at top right, #151d2f 0%, #0c121e 70%)" }}
      >
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:px-7 border-b border-white/[0.08] bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 text-xs">
                <FaSearch />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Discover & Add Songs
              </h2>
            </div>
            <p className="text-xs text-gray-400">
              Pick songs from your anime list, search any MAL title, or find Spotify tracks.
            </p>
          </div>

          {/* Destination Playlist Selector & Inline Playlist Creator */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {isSpotifyConnected ? (
              <div className="flex items-center gap-1.5">
                {isCreatingInline ? (
                  <form
                    onSubmit={handleInlineCreatePlaylist}
                    className="flex items-center gap-2 bg-white/[0.08] border border-emerald-500/50 rounded-2xl px-3 py-1.5 animate-fade-in"
                  >
                    <FaSpotify className="text-emerald-400 text-sm shrink-0" />
                    <input
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="New playlist name..."
                      autoFocus
                      className="bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none w-40"
                    />
                    <button
                      type="submit"
                      disabled={!newPlaylistName.trim()}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition disabled:opacity-40"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingInline(false);
                        setNewPlaylistName("");
                      }}
                      className="text-gray-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-3 py-1.5 focus-within:border-emerald-500/50">
                      <FaSpotify className="text-emerald-400 text-sm shrink-0" />
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold hidden md:inline">
                        Destination:
                      </span>
                      <select
                        value={selectedPlaylistId}
                        onChange={(e) => {
                          if (e.target.value === "__create_new__") {
                            setIsCreatingInline(true);
                          } else {
                            setSelectedPlaylistId(e.target.value);
                          }
                        }}
                        className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
                      >
                        {spotifyPlaylists.map((pl) => (
                          <option key={pl.id} value={pl.id} className="bg-[#0f172a] text-white">
                            {pl.isDraft
                              ? `⭐ [Draft] ${pl.name} (${pl.totalTracks || 0} tracks)`
                              : `${pl.name} (${pl.totalTracks || 0} tracks)`}
                          </option>
                        ))}
                        <option value="__create_new__" className="bg-[#0f172a] text-emerald-400 font-bold">
                          + Create New Draft Playlist...
                        </option>
                      </select>
                      {loadingTracks && (
                        <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                      )}
                    </div>

                    {/* + New Playlist Button */}
                    <button
                      type="button"
                      onClick={() => setIsCreatingInline(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition active:scale-95"
                      title="Start a new draft playlist"
                    >
                      <FaPlus className="text-[10px]" />
                      <span>New</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={connectSpotify}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition"
              >
                <FaSpotify /> Connect Spotify
              </button>
            )}

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
              aria-label="Close"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* ── Feedback Banner ─────────────────────────────────────────── */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                : feedbackMessage.type === "info"
                ? "bg-blue-500/15 border-blue-500/30 text-blue-200"
                : feedbackMessage.type === "warning"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                : "bg-red-500/15 border-red-500/30 text-red-200"
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-gray-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Mode Switcher & Search Bar ───────────────────────────────── */}
        <div className="p-4 sm:px-7 border-b border-white/[0.06] bg-black/20 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.08] p-1 shrink-0 self-start sm:self-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSearchMode("user-list");
                  setSelectedAnime(null);
                  setSearchQuery("");
                  const userToLoad = targetUsername || authUsername;
                  if (userToLoad && userAnimeList.length === 0) {
                    fetchUserAnimeList(userToLoad);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === "user-list"
                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FaUser className="text-[10px]" />
                {authUsername && targetUsername.toLowerCase() === authUsername.toLowerCase()
                  ? `My Anime List (@${authUsername})`
                  : targetUsername
                  ? `${targetUsername}'s List`
                  : "User's Anime List"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchMode("anime");
                  setSelectedAnime(null);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === "anime"
                    ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FaListUl className="text-[10px]" />
                All Anime (MAL)
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchMode("song");
                  setSelectedAnime(null);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === "song"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <FaMusic className="text-[10px]" />
                Song / Artist
              </button>
            </div>

            {/* If in User-List mode, show user quick switch pills */}
            {searchMode === "user-list" && !selectedAnime && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {authUsername && authUsername.toLowerCase() !== targetUsername.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => fetchUserAnimeList(authUsername)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-[11px] font-medium border border-white/[0.08] transition"
                  >
                    Switch to My List (@{authUsername})
                  </button>
                )}
                {isValidUsername(currentUsername) &&
                  currentUsername.toLowerCase() !== targetUsername.toLowerCase() &&
                  currentUsername.toLowerCase() !== authUsername?.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => fetchUserAnimeList(currentUsername)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-[11px] font-medium border border-white/[0.08] transition"
                    >
                      Switch to @{currentUsername}
                    </button>
                  )}
              </div>
            )}
          </div>

          {/* Search Input Box */}
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 focus-within:border-rose-500/40 focus-within:bg-white/[0.06] transition-all">
            <FaSearch className="text-gray-500 text-xs shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchMode === "user-list"
                  ? `Filter within ${targetUsername || "user"}'s anime list (e.g. Naruto, Gintama, Bleach)...`
                  : searchMode === "anime"
                  ? "Search anime by title across all MAL (e.g. Naruto, Demon Slayer)..."
                  : "Search song title, artist, or keyword on Spotify..."
              }
              className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-full"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
            {isSearching && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* User List Status Filters (only in user-list mode when not viewing anime soundtracks) */}
          {searchMode === "user-list" && !selectedAnime && userAnimeList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mr-1">
                Status:
              </span>
              {USER_STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setUserListStatusFilter(f.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    userListStatusFilter === f.key
                      ? "bg-rose-600 text-white shadow-sm shadow-rose-500/20"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-[11px] text-gray-500 ml-auto">
                Showing {filteredUserAnimeList.length} of {userAnimeList.length} titles
              </span>
            </div>
          )}
        </div>

        {/* ── Main Content Area (Scrollable) ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 min-h-[320px] max-h-[55vh]">
          {/* If an anime is selected (from user list OR MAL), show its soundtracks */}
          {selectedAnime ? (
            <div className="space-y-6">
              {/* Anime Header & Back Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedAnime(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/[0.1] transition"
                  >
                    <FaArrowLeft className="text-xs" />
                    Back to Anime List
                  </button>
                  <div className="flex items-center gap-3">
                    <img
                      src={selImg}
                      alt={selTitle}
                      className="w-12 h-16 rounded-lg object-cover border border-white/10"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder-anime.jpg";
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                        {selTitle}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        {selScore && (
                          <span className="text-yellow-400 font-semibold">
                            ★ {selScore}
                          </span>
                        )}
                        {selType && <span>· {selType}</span>}
                        <span>· {animeSoundtracks.length} theme songs</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Theme Filter & Select All */}
                <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                  <div className="flex rounded-lg bg-white/[0.05] p-0.5 border border-white/[0.08]">
                    <button
                      onClick={() => setThemeFilter("all")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                        themeFilter === "all"
                          ? "bg-rose-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      All ({animeSoundtracks.length})
                    </button>
                    <button
                      onClick={() => setThemeFilter("opening")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                        themeFilter === "opening"
                          ? "bg-rose-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Openings (
                      {
                        animeSoundtracks.filter(
                          (s) => s.type?.toLowerCase() === "opening"
                        ).length
                      }
                      )
                    </button>
                    <button
                      onClick={() => setThemeFilter("ending")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                        themeFilter === "ending"
                          ? "bg-rose-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Endings (
                      {
                        animeSoundtracks.filter(
                          (s) => s.type?.toLowerCase() === "ending"
                        ).length
                      }
                      )
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(filteredSoundtracks)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.1] transition"
                  >
                    {filteredSoundtracks
                      .filter((s) => !isSongInPlaylist(s))
                      .every((s) =>
                        selectedSongs.some(
                          (sel) =>
                            (sel.uri || `${sel.name}-${sel.artist}`) ===
                            (s.uri || `${s.name}-${s.artist}`)
                        )
                      ) && filteredSoundtracks.filter((s) => !isSongInPlaylist(s)).length > 0
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
              </div>

              {/* Soundtracks List */}
              {loadingSoundtracks ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-7 h-7 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Loading opening & ending themes…</p>
                </div>
              ) : filteredSoundtracks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No soundtrack themes found for this anime.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {filteredSoundtracks.map((song, i) => {
                    const inPlaylist = isSongInPlaylist(song);
                    const isSelected = selectedSongs.some(
                      (s) =>
                        (s.uri || `${s.name}-${s.artist}`) ===
                        (song.uri || `${song.name}-${song.artist}`)
                    );
                    const isQuickAdding =
                      addingSongKey === (song.uri || `${song.name}-${song.artist}`);

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between gap-3 py-3 px-3 rounded-xl transition ${
                          inPlaylist
                            ? "bg-emerald-500/[0.03] opacity-80"
                            : isSelected
                            ? "bg-rose-500/[0.12] border border-rose-500/20"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Checkbox & Song Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={inPlaylist || isSelected}
                            disabled={inPlaylist}
                            onChange={() => toggleSelectSong(song)}
                            className={`w-4 h-4 rounded cursor-pointer ${
                              inPlaylist
                                ? "accent-emerald-500 cursor-not-allowed opacity-80"
                                : "accent-rose-600"
                            }`}
                          />

                          {/* Theme Badge (OP / ED) */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                              song.type?.toLowerCase() === "opening"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {song.type?.slice(0, 2).toUpperCase() || "OP"}{" "}
                            {song.sequence ? `#${song.sequence}` : ""}
                          </span>

                          {/* Title & Artist */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {song.name || song.rawText}
                            </p>
                            {song.artist && (
                              <p className="text-xs text-gray-400 truncate">
                                {song.artist}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions / Status */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handlePreviewSong(song)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-gray-400 transition"
                            title="Preview on Spotify"
                          >
                            <FaPlay className="text-[10px] ml-0.5" />
                          </button>

                          {inPlaylist ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <FaCheck className="text-[10px]" />
                              In Playlist
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAddSingle(song)}
                              disabled={isAdding || isQuickAdding}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-500/20 text-white transition active:scale-95 disabled:opacity-50"
                            >
                              {isQuickAdding ? (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <FaPlus className="text-[10px]" />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : searchMode === "user-list" ? (
            /* ── VIEW: USER'S ANIME LIST ────────────────────────────── */
            <div>
              {!targetUsername && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FaUser className="text-4xl text-gray-600 mb-3" />
                  <h3 className="text-base font-semibold text-white mb-2">
                    Select Anime From User List
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-sm">
                    Enter any Kiroku / MyAnimeList username to browse and pick anime from their watch list.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      fetchUserAnimeList(inputUsername);
                    }}
                    className="flex gap-2 w-full max-w-sm"
                  >
                    <input
                      type="text"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="Enter username (e.g. PlasmaFists)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputUsername.trim() || loadingUserAnime}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                    >
                      {loadingUserAnime ? "Loading..." : "Load List"}
                    </button>
                  </form>
                </div>
              )}

              {loadingUserAnime && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Loading anime list for "{targetUsername}"…</p>
                </div>
              )}

              {userAnimeError && !loadingUserAnime && (
                <div className="text-center py-12">
                  <p className="text-sm text-red-300 mb-3">{userAnimeError}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      fetchUserAnimeList(inputUsername);
                    }}
                    className="flex justify-center gap-2 max-w-xs mx-auto"
                  >
                    <input
                      type="text"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="Try another username..."
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                    >
                      Search
                    </button>
                  </form>
                </div>
              )}

              {!loadingUserAnime && !userAnimeError && targetUsername && (
                <>
                  {filteredUserAnimeList.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 text-sm">
                      {searchQuery
                        ? `No anime found matching "${searchQuery}" in ${targetUsername}'s list.`
                        : `No anime found under the selected status filter.`}
                    </div>
                  ) : (
                    <>
                      {/* Multi-Anime Batch Selection Toolbar */}
                      {filteredUserAnimeList.length > 0 && (
                        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex-wrap">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectAllAnime(filteredUserAnimeList)}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2"
                            >
                              <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                selectedAnimeIds.size >= filteredUserAnimeList.length && filteredUserAnimeList.length > 0
                                  ? "bg-rose-600 border-rose-500 text-white"
                                  : "border-white/30 bg-transparent"
                              }`}>
                                {selectedAnimeIds.size >= filteredUserAnimeList.length && filteredUserAnimeList.length > 0 && (
                                  <FaCheck className="text-[9px]" />
                                )}
                              </span>
                              <span>
                                {selectedAnimeIds.size >= filteredUserAnimeList.length && filteredUserAnimeList.length > 0
                                  ? "Deselect All"
                                  : `Select All Anime (${filteredUserAnimeList.length})`}
                              </span>
                            </button>

                            {selectedAnimeIds.size > 0 && (
                              <span className="text-xs text-rose-300 font-semibold">
                                {selectedAnimeIds.size} anime selected
                              </span>
                            )}
                          </div>

                          {selectedAnimeIds.size > 0 && (
                            <button
                              type="button"
                              disabled={isBatchAddingAnime}
                              onClick={handleAddBatchAnime}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                              {isBatchAddingAnime ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Adding Soundtracks from {selectedAnimeIds.size} Anime...</span>
                                </>
                              ) : (
                                <>
                                  <FaPlus className="text-xs" />
                                  <span>Add All Songs from {selectedAnimeIds.size} Selected Anime</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {filteredUserAnimeList.map((item) => {
                          const malId = item.animeMalId ?? item.malId;
                          const title = item.animeTitle ?? item.title ?? "Untitled";
                          const score = item.score ?? item.animeScore ?? item.Score;
                          const status = item.status ?? "";
                          const img =
                            item.animeImageUrl ||
                            item.images?.[0]?.imageUrl ||
                            "/placeholder-anime.jpg";
                          const isSelected = selectedAnimeIds.has(malId);
                          const addingState = addingAnimeMap[malId];

                          return (
                            <div
                              key={malId || title}
                              onClick={() => handleSelectAnime(item)}
                              className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col ${
                                isSelected
                                  ? "border-rose-500/80 bg-rose-500/[0.05] shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50"
                                  : "border-white/[0.08] bg-white/[0.03] hover:border-rose-500/40 hover:bg-white/[0.06]"
                              }`}
                            >
                              <div className="relative aspect-[3/4] overflow-hidden">
                                <img
                                  src={img}
                                  alt={title}
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "/placeholder-anime.jpg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                
                                {/* Anime Selection Checkbox Overlay */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectAnime(malId);
                                  }}
                                  className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/40 border border-rose-400"
                                      : "bg-black/60 hover:bg-black/80 text-transparent hover:text-white/60 border border-white/20 backdrop-blur-sm"
                                  }`}
                                  title={isSelected ? "Deselect anime" : "Select anime"}
                                >
                                  <FaCheck className={`text-xs ${isSelected ? "opacity-100" : "opacity-0 hover:opacity-100"}`} />
                                </button>

                                {score > 0 && (
                                  <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold text-yellow-400 border border-white/10 flex items-center gap-1">
                                    <FaStar className="text-[9px]" /> {score}
                                  </div>
                                )}
                                {status && (
                                  <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-200 border border-white/10 capitalize">
                                    {status}
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex-1 flex flex-col justify-between">
                                <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2 group-hover:text-rose-300 transition-colors">
                                  {title}
                                </h4>
                                
                                {/* Quick Add Whole Anime + Browse Songs Actions */}
                                <div className="mt-2.5 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={addingState === "loading"}
                                    onClick={(e) => handleAddAllAnimeSongs(item, e)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm ${
                                      addingState === "done"
                                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                        : addingState === "loading"
                                        ? "bg-white/[0.08] text-gray-400 cursor-wait"
                                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95"
                                    }`}
                                    title="Add all theme songs from this anime directly into the playlist"
                                  >
                                    {addingState === "loading" ? (
                                      <>
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                        <span>Adding...</span>
                                      </>
                                    ) : addingState === "done" ? (
                                      <>
                                        <FaCheck className="text-[10px] text-emerald-400" />
                                        <span>Added!</span>
                                      </>
                                    ) : (
                                      <>
                                        <FaPlus className="text-[9px]" />
                                        <span>Add All Songs</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAnime(item)}
                                    className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-semibold text-gray-300 hover:text-white transition flex items-center justify-center gap-1 border border-white/[0.08]"
                                    title="View individual songs"
                                  >
                                    <FaMusic className="text-[9px]" />
                                    <span>Songs</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : searchMode === "anime" ? (
            /* ── VIEW: GLOBAL MAL ANIME SEARCH ───────────────────────── */
            <div>
              {!debouncedQuery ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <FaSearch className="text-3xl text-gray-600 mb-3 opacity-60" />
                  <p className="text-sm font-medium text-gray-300">
                    Search any anime to browse its soundtracks
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    E.g. Naruto, Gintama, Attack on Titan, Demon Slayer, Bleach
                  </p>
                </div>
              ) : animeResults.length === 0 && !isSearching ? (
                <div className="text-center py-16 text-gray-500 text-sm">
                  No anime found for "{debouncedQuery}". Try another title.
                </div>
              ) : (
                <>
                  {/* Multi-Anime Batch Selection Toolbar for Search */}
                  {animeResults.length > 0 && (
                    <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex-wrap">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAllAnime(animeResults)}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2"
                        >
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            selectedAnimeIds.size >= animeResults.length && animeResults.length > 0
                              ? "bg-rose-600 border-rose-500 text-white"
                              : "border-white/30 bg-transparent"
                          }`}>
                            {selectedAnimeIds.size >= animeResults.length && animeResults.length > 0 && (
                              <FaCheck className="text-[9px]" />
                            )}
                          </span>
                          <span>
                            {selectedAnimeIds.size >= animeResults.length && animeResults.length > 0
                              ? "Deselect All"
                              : `Select All Search Results (${animeResults.length})`}
                          </span>
                        </button>

                        {selectedAnimeIds.size > 0 && (
                          <span className="text-xs text-rose-300 font-semibold">
                            {selectedAnimeIds.size} anime selected
                          </span>
                        )}
                      </div>

                      {selectedAnimeIds.size > 0 && (
                        <button
                          type="button"
                          disabled={isBatchAddingAnime}
                          onClick={handleAddBatchAnime}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {isBatchAddingAnime ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Adding Soundtracks from {selectedAnimeIds.size} Anime...</span>
                            </>
                          ) : (
                            <>
                              <FaPlus className="text-xs" />
                              <span>Add All Songs from {selectedAnimeIds.size} Selected Anime</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {animeResults.map((anime) => {
                      const malId = anime.malId ?? anime.MalId;
                      const title = anime.title ?? anime.Title ?? "Untitled";
                      const score = anime.score ?? anime.Score;
                      const type = anime.type ?? anime.Type;
                      const images = anime.images || anime.Images;
                      const img =
                        images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.imageUrl ||
                        images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
                        images?.[0]?.imageUrl ||
                        images?.[0]?.ImageUrl ||
                        "/placeholder-anime.jpg";
                      const isSelected = selectedAnimeIds.has(malId);
                      const addingState = addingAnimeMap[malId];

                      return (
                        <div
                          key={malId}
                          onClick={() => handleSelectAnime(anime)}
                          className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col ${
                            isSelected
                              ? "border-rose-500/80 bg-rose-500/[0.05] shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50"
                              : "border-white/[0.08] bg-white/[0.03] hover:border-rose-500/40 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img
                              src={img}
                              alt={title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/placeholder-anime.jpg";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                            {/* Anime Selection Checkbox Overlay */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectAnime(malId);
                              }}
                              className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/40 border border-rose-400"
                                  : "bg-black/60 hover:bg-black/80 text-transparent hover:text-white/60 border border-white/20 backdrop-blur-sm"
                              }`}
                              title={isSelected ? "Deselect anime" : "Select anime"}
                            >
                              <FaCheck className={`text-xs ${isSelected ? "opacity-100" : "opacity-0 hover:opacity-100"}`} />
                            </button>

                            {score && (
                              <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold text-yellow-400 border border-white/10">
                                ★ {score}
                              </div>
                            )}
                            {type && (
                              <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-200 border border-white/10 uppercase">
                                {type}
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2 group-hover:text-rose-300 transition-colors">
                              {title}
                            </h4>
                            
                            {/* Quick Add Whole Anime + Browse Songs Actions */}
                            <div className="mt-2.5 flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={addingState === "loading"}
                                onClick={(e) => handleAddAllAnimeSongs(anime, e)}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm ${
                                  addingState === "done"
                                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                                    : addingState === "loading"
                                    ? "bg-white/[0.08] text-gray-400 cursor-wait"
                                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95"
                                }`}
                                title="Add all theme songs from this anime directly into the playlist"
                              >
                                {addingState === "loading" ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    <span>Adding...</span>
                                  </>
                                ) : addingState === "done" ? (
                                  <>
                                    <FaCheck className="text-[10px] text-emerald-400" />
                                    <span>Added!</span>
                                  </>
                                ) : (
                                  <>
                                    <FaPlus className="text-[9px]" />
                                    <span>Add All Songs</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectAnime(anime)}
                                className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-semibold text-gray-300 hover:text-white transition flex items-center justify-center gap-1 border border-white/[0.08]"
                                title="View individual songs"
                              >
                                <FaMusic className="text-[9px]" />
                                <span>Songs</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── VIEW: DIRECT SPOTIFY SONG / ARTIST SEARCH ───────────── */
            <div>
              {!debouncedQuery ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <FaMusic className="text-3xl text-gray-600 mb-3 opacity-60" />
                  <p className="text-sm font-medium text-gray-300">
                    Search songs directly by title, artist, or keyword
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    Discover and add tracks even if they are not in your anime watch list.
                  </p>
                </div>
              ) : songResults.length === 0 && !isSearching ? (
                <div className="text-center py-16 text-gray-500 text-sm">
                  No Spotify tracks found for "{debouncedQuery}".
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs text-gray-400">
                    <span>{songResults.length} tracks found on Spotify</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectAll(songResults)}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      {songResults
                        .filter((s) => !isSongInPlaylist(s))
                        .every((s) =>
                          selectedSongs.some((sel) => sel.uri === s.uri)
                        ) && songResults.filter((s) => !isSongInPlaylist(s)).length > 0
                        ? "Deselect All"
                        : "Select All Available"}
                    </button>
                  </div>

                  {songResults.map((song, index) => {
                    const inPlaylist = isSongInPlaylist(song);
                    const isSelected = selectedSongs.some((s) => s.uri === song.uri);
                    const isQuickAdding = addingSongKey === song.uri;

                    return (
                      <div
                        key={`${song.id || song.uri || song.name}-${index}`}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition ${
                          inPlaylist
                            ? "bg-emerald-500/[0.03] opacity-80"
                            : isSelected
                            ? "bg-emerald-600/[0.12] border border-emerald-500/20"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={inPlaylist || isSelected}
                            disabled={inPlaylist}
                            onChange={() => toggleSelectSong(song)}
                            className={`w-4 h-4 rounded cursor-pointer ${
                              inPlaylist
                                ? "accent-emerald-500 cursor-not-allowed opacity-80"
                                : "accent-emerald-500"
                            }`}
                          />

                          {song.imageUrl ? (
                            <img
                              src={song.imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                              <FaMusic className="text-gray-500 text-xs" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {song.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {song.artist || song.artists?.join(", ")}
                              {song.albumName ? ` · ${song.albumName}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {song.durationMs > 0 && (
                            <span className="text-xs text-gray-500 hidden sm:inline">
                              {formatDuration(song.durationMs)}
                            </span>
                          )}

                          <button
                            onClick={() => handlePreviewSong(song)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-gray-400 transition"
                            title="Preview track"
                          >
                            <FaPlay className="text-[10px] ml-0.5" />
                          </button>

                          {inPlaylist ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <FaCheck className="text-[10px]" />
                              In Playlist
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAddSingle(song)}
                              disabled={isAdding || isQuickAdding}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 disabled:opacity-50"
                            >
                              {isQuickAdding ? (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <FaPlus className="text-[10px]" />
                              )}
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Sticky Bottom Action Bar ──────────────────────────── */}
        <div className="p-4 sm:px-7 border-t border-white/[0.08] bg-[#0c121e]/95 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-300">
              {selectedSongs.length} song(s) selected
            </span>
            {selectedSongs.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSongs([])}
                className="text-xs text-gray-500 hover:text-white underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedSongs.length === 0 || isAdding || !selectedPlaylistId}
              onClick={() => handleAddSongs(selectedSongs)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Adding to Spotify…
                </>
              ) : (
                <>
                  <FaPlus className="text-xs" />
                  Add {selectedSongs.length > 0 ? selectedSongs.length : ""}{" "}
                  Selected to {currentDestination?.name || "Playlist"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
