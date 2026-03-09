import { useSpotify } from "../context/SpotifyContext";

export default function SpotifyBar() {
  const { currentTrack } = useSpotify();

  if (!currentTrack?.uri) return null;
  const trackId = currentTrack.uri.split(":")[2];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-2 flex items-center gap-4 shadow-lg z-50">
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="350"
        height="80"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        title="Spotify Player"
        className="rounded-md"
      />
      <div className="flex flex-col ml-4 overflow-hidden">
        <span className="text-white font-semibold truncate max-w-xs">{currentTrack.name}</span>
        <span className="text-gray-400 text-sm truncate max-w-xs">
          {Array.isArray(currentTrack.artists)
            ? currentTrack.artists.join(", ")
            : currentTrack.artists}
        </span>
      </div>
    </div>
  );
}
