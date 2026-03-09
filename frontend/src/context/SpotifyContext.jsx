import React, { createContext, useContext, useState } from "react";

const SpotifyContext = createContext();

export const useSpotify = () => {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
};

export const SpotifyProvider = ({ children }) => {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack =
    currentTrackIndex !== null ? playlist[currentTrackIndex] : null;

  const playTrackAtIndex = (index, trackDataFromBackend = null) => {
    if (trackDataFromBackend) {
      setPlaylist((prev) => {
        const updated = [...prev];
        updated[index] = trackDataFromBackend; // replace with backend's clean Spotify track
        return updated;
      });
    }
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };
const playNext = () => {
  if (!playlist.length || currentTrackIndex === null) return;

  let nextIndex = currentTrackIndex;
  let iterations = 0;

  do {
    nextIndex = (nextIndex + 1) % playlist.length;
    iterations++;
    // stop if we looped through all songs with no match
    if (iterations > playlist.length) {
      return;
    }
  } while (!playlist[nextIndex]?.uri);

  setCurrentTrackIndex(nextIndex);
  setIsPlaying(true);
};

const playPrevious = () => {
  if (!playlist.length || currentTrackIndex === null) return;

  let prevIndex = currentTrackIndex;
  let iterations = 0;

  do {
    prevIndex = (prevIndex - 1 + playlist.length) % playlist.length;
    iterations++;
    if (iterations > playlist.length) {
      return;
    }
  } while (!playlist[prevIndex]?.uri);

  setCurrentTrackIndex(prevIndex);
  setIsPlaying(true);
};


  const togglePlayPause = () => setIsPlaying((prev) => !prev);

  return (
    <SpotifyContext.Provider
      value={{
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
