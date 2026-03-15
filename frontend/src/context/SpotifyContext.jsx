import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const SpotifyContext = createContext();

export const useSpotify = () => {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
};

// Proactively refresh 2 minutes before the token actually expires
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

export const SpotifyProvider = ({ children }) => {
  // ── Playlist / playback ───────────────────────────────────────────────────
  const [playlist, setPlaylist]                   = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying]                 = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  // accessToken : short-lived, kept in memory only (never localStorage)
  // sessionId   : opaque key stored in localStorage → used to ask our backend
  //               to refresh using the refresh_token it holds in Redis
  const [accessToken, setAccessToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState(null);

  // Refs — survive re-renders without causing them
  const refreshTimerRef = useRef(null);
  // Holds the latest refreshAccessToken fn so the setTimeout in scheduleRefresh
  // never captures a stale closure.
  const refreshFnRef    = useRef(null);

  const isSpotifyConnected = !!accessToken;
  const currentTrack       = currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

  // ── clearAuth ─────────────────────────────────────────────────────────────
  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setSpotifyUser(null);
    localStorage.removeItem("spotify_session_id");
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ── scheduleRefresh ───────────────────────────────────────────────────────
  // Called after storing a new access token. Schedules an auto-refresh
  // via refreshFnRef so it always calls the up-to-date function.
  const scheduleRefresh = useCallback((expiresInSeconds) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = expiresInSeconds * 1000 - REFRESH_BUFFER_MS;
    if (delay > 0) {
      refreshTimerRef.current = setTimeout(() => {
        refreshFnRef.current?.();
      }, delay);
    }
  }, []);

  // ── applyToken ────────────────────────────────────────────────────────────
  const applyToken = useCallback((token, expiresInSeconds) => {
    setAccessToken(token);
    scheduleRefresh(expiresInSeconds);
  }, [scheduleRefresh]);

  // ── refreshAccessToken ────────────────────────────────────────────────────
  const refreshAccessToken = useCallback(async () => {
    const sid = localStorage.getItem("spotify_session_id");
    if (!sid) return;

    try {
      const { data } = await axios.post("/api/v1/spotifyauth/refresh", { sessionId: sid });
      applyToken(data.access_token, data.expires_in);
    } catch {
      // Session expired on the backend — user needs to reconnect
      clearAuth();
    }
  }, [applyToken, clearAuth]);

  // Keep the ref pointing at the latest version so the timer closure is never stale
  useEffect(() => {
    refreshFnRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  // ── On mount: silent re-login if a session exists ─────────────────────────
  useEffect(() => {
    const sid = localStorage.getItem("spotify_session_id");
    if (sid) refreshAccessToken();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch Spotify user profile whenever we get a new token ────────────────
  useEffect(() => {
    if (!accessToken) return;
    axios
      .get("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then(({ data }) => setSpotifyUser(data))
      .catch(() => {}); // non-critical — don't break the flow
  }, [accessToken]);

  // ── connectSpotify: kick off the OAuth redirect ───────────────────────────
  const connectSpotify = useCallback(async () => {
    setAuthError(null);
    try {
      const { data } = await axios.get("/api/v1/spotifyauth/login");
      // Persist state for CSRF verification in the callback page
      sessionStorage.setItem("spotify_oauth_state", data.state);
      // Hard redirect to Spotify's auth page
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("Failed to start Spotify login:", err);
      setAuthError("Could not reach the server. Please try again.");
    }
  }, []);

  // ── handleCallback: called by SpotifyCallback.jsx after redirect ──────────
  const handleCallback = useCallback(async (code, state) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const storedState = sessionStorage.getItem("spotify_oauth_state");
      if (state !== storedState) throw new Error("State mismatch — possible CSRF attack.");
      sessionStorage.removeItem("spotify_oauth_state");

      const { data } = await axios.post("/api/v1/spotifyauth/callback", { code, state });

      // Only the opaque session_id goes to localStorage — never the refresh token
      localStorage.setItem("spotify_session_id", data.session_id);
      applyToken(data.access_token, data.expires_in);
    } catch (err) {
      console.error("Spotify callback error:", err);
      setAuthError("Spotify login failed. Please try again.");
      clearAuth();
    } finally {
      setAuthLoading(false);
    }
  }, [applyToken, clearAuth]);

  // ── disconnectSpotify ─────────────────────────────────────────────────────
  const disconnectSpotify = useCallback(async () => {
    const sid = localStorage.getItem("spotify_session_id");
    if (sid) {
      // Ask backend to delete the refresh token from Redis (best-effort)
      await axios.post("/api/v1/spotifyauth/logout", { sessionId: sid }).catch(() => {});
    }
    clearAuth();
  }, [clearAuth]);

  // ── Playback helpers ──────────────────────────────────────────────────────
  const playTrackAtIndex = useCallback((index, trackData = null) => {
    if (trackData) {
      setPlaylist((prev) => {
        const updated = [...prev];
        updated[index] = trackData;
        return updated;
      });
    }
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  }, []);

  const playNext = useCallback(() => {
    if (!playlist.length || currentTrackIndex === null) return;
    let next = currentTrackIndex, i = 0;
    do {
      next = (next + 1) % playlist.length;
      if (++i > playlist.length) return;
    } while (!playlist[next]?.uri);
    setCurrentTrackIndex(next);
    setIsPlaying(true);
  }, [playlist, currentTrackIndex]);

  const playPrevious = useCallback(() => {
    if (!playlist.length || currentTrackIndex === null) return;
    let prev = currentTrackIndex, i = 0;
    do {
      prev = (prev - 1 + playlist.length) % playlist.length;
      if (++i > playlist.length) return;
    } while (!playlist[prev]?.uri);
    setCurrentTrackIndex(prev);
    setIsPlaying(true);
  }, [playlist, currentTrackIndex]);

  const togglePlayPause = useCallback(() => setIsPlaying((p) => !p), []);

  // ── Provider ──────────────────────────────────────────────────────────────
  return (
    <SpotifyContext.Provider
      value={{
        // Auth
        isSpotifyConnected,
        accessToken,
        spotifyUser,
        authLoading,
        authError,
        connectSpotify,
        disconnectSpotify,
        handleCallback,
        // Playback
        playlist,
        setPlaylist,
        currentTrackIndex,
        currentTrack,
        isPlaying,
        playTrackAtIndex,
        playNext,
        playPrevious,
        togglePlayPause,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};