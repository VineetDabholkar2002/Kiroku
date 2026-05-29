import { useSpotify } from "../context/SpotifyContext";

export default function SpotifyBar() {
  const { currentSpotifyTrack, playKey } = useSpotify();

  if (!currentSpotifyTrack?.uri) return null;

  const trackId = currentSpotifyTrack.uri.split(":")[2];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-2 flex items-center gap-4 shadow-lg z-50">
      <iframe
        key={`${trackId}-${playKey}`}
        src={`https://open.spotify.com/embed/track/${trackId}?autoplay=1`}
        width="350"
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        title="Spotify Player"
        className="rounded-md"
      />
      <div className="flex flex-col ml-4 overflow-hidden">
        <span className="text-white font-semibold truncate max-w-xs">{currentSpotifyTrack.name}</span>
        <span className="text-gray-400 text-sm truncate max-w-xs">
          {Array.isArray(currentSpotifyTrack.artists)
            ? currentSpotifyTrack.artists.join(", ")
            : currentSpotifyTrack.artists}
        </span>
      </div>
    </div>
  );
}