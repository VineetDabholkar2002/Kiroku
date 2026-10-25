import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useSpotify } from "../../context/SpotifyContext";
import { FaSpotify, FaTimes, FaPlus, FaTrashAlt, FaMusic } from "react-icons/fa";

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
  defaultName = "My Anime Playlist",
  defaultDescription = "Created with Kiroku Anime Soundtrack Explorer",
  songCount = 0,
  songs = [],
  onSaveWithTracks = null,
}) {
  const { accessToken, isSpotifyConnected, connectSpotify } = useSpotify();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSongsList, setSelectedSongsList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription(defaultDescription);
      setError(null);
      setLoading(false);
      setSelectedSongsList(Array.isArray(songs) ? [...songs] : []);
    }
  }, [isOpen, defaultName, defaultDescription, songs]);

  if (!isOpen) return null;

  const handleRemoveSong = (indexToRemove) => {
    setSelectedSongsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const currentCount = selectedSongsList.length > 0 ? selectedSongsList.length : songCount;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please provide a name for the playlist.");
      return;
    }

    if (!isSpotifyConnected || !accessToken) {
      connectSpotify();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (onSaveWithTracks) {
        // If caller provided a handler to save with tracks directly:
        await onSaveWithTracks({
          name: trimmedName,
          description: description.trim(),
          songs: selectedSongsList,
        });
        onClose();
        return;
      }

      // Otherwise create an empty playlist on Spotify
      const { data } = await api.post(
        "/api/v1/spotify/create-playlist",
        { name: trimmedName, description: description.trim() },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (onCreated) {
        onCreated(data);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create Spotify playlist:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to create playlist on Spotify. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl border border-white/[0.12] bg-[#0c121e] text-gray-200 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "radial-gradient(circle at top right, #172236 0%, #0c121e 75%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 text-base shadow-sm">
              <FaSpotify />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {onSaveWithTracks ? "Save to New Spotify Playlist" : "Create New Spotify Playlist"}
              </h3>
              <p className="text-[11px] text-gray-400">
                {currentCount > 0
                  ? `Will create and add ${currentCount} track(s) to Spotify`
                  : "Create an empty playlist on your Spotify account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
            aria-label="Close"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Form Body - Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Playlist Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hype Anime Openings, Late Night Chill..."
              maxLength={100}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white text-sm focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.07] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Description <span className="text-gray-500 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what kind of tracks are in this playlist..."
              rows={2}
              maxLength={250}
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white text-xs focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.07] transition resize-none"
            />
          </div>

          {/* Selected Songs Preview Section */}
          {selectedSongsList.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FaMusic className="text-rose-400 text-xs" />
                  Selected Songs ({selectedSongsList.length})
                </span>
                <span className="text-[11px] text-gray-400">
                  Review tracks before saving
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/40 divide-y divide-white/[0.04] max-h-56 overflow-y-auto pr-1">
                {selectedSongsList.map((song, idx) => {
                  const songImg =
                    song.image ||
                    song.imageUrl ||
                    song.animeImage ||
                    "/placeholder-anime.jpg";
                  const songArtist = Array.isArray(song.artist)
                    ? song.artist.join(", ")
                    : song.artist || "Unknown Artist";

                  return (
                    <div
                      key={song.id || song.uri || `${song.name}-${idx}`}
                      className="flex items-center justify-between p-2.5 hover:bg-white/[0.04] transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <span className="text-[11px] font-mono text-gray-500 w-5 text-right shrink-0">
                          {idx + 1}
                        </span>
                        <img
                          src={songImg}
                          alt={song.name}
                          className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0 bg-slate-900"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/placeholder-anime.jpg";
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate leading-snug">
                            {song.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate mt-0.5">
                            <span className="text-rose-300 truncate">{songArtist}</span>
                            {song.animeTitle && (
                              <>
                                <span className="text-gray-600">·</span>
                                <span className="text-gray-400 truncate">{song.animeTitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSong(idx)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 opacity-80 group-hover:opacity-100"
                        title="Remove track"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.08] shrink-0">
            <span className="text-xs text-gray-400">
              Total tracks: <strong className="text-white">{currentCount}</strong>
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || currentCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Creating on Spotify...
                  </>
                ) : (
                  <>
                    <FaPlus className="text-xs" />
                    Create Playlist ({currentCount} tracks)
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
