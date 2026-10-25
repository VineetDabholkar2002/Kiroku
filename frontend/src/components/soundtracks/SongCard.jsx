import React, { memo } from "react";
import { FaPlay, FaPause } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

const STATUS_BADGE = {
  completed: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  watching: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  plantowatch: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
};

function statusBadgeClass(status) {
  if (!status) return "";
  return STATUS_BADGE[status.toLowerCase().replace(/\s+/g, "")] ?? "bg-gray-500/20 text-gray-300 border border-gray-500/30";
}

const SongCard = memo(function SongCard({ song, isCurrent, onPlay, canPlay = true }) {
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

      {/* Album art */}
      <div className="relative overflow-hidden aspect-square">
        <img
          src={song.image}
          alt={song.name ?? "Song cover"}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

        {/* Now playing badge */}
        {isCurrent && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-full tracking-wider">
            <span className="flex gap-[2px] items-end" style={{ height: "10px" }}>
              {[0, 150, 75, 225].map((delay, i) => (
                <span
                  key={i}
                  className="w-[2px] bg-black rounded-full animate-bounce"
                  style={{ height: `${[40, 100, 60, 80][i]}%`, animationDelay: `${delay}ms`, animationDuration: "0.7s" }}
                />
              ))}
            </span>
            PLAYING
          </div>
        )}

        {/* Play button */}
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

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-white text-[13px] leading-snug truncate">{song.name}</h3>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{artistLabel}</p>
        {song.animeTitle && (
          <p className="flex items-center gap-1 text-[11px] text-rose-400/90 truncate mt-1.5">
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

export default SongCard;
