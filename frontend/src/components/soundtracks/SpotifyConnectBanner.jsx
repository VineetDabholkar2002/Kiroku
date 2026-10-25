import React from "react";
import { FaSpotify } from "react-icons/fa";

export default function SpotifyConnectBanner({ onConnect, isLoading, error }) {
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
            <p className="text-white font-semibold">Connect Spotify to save playlists</p>
            <p className="text-gray-400 text-sm mt-0.5">Your account's own token is used. Credentials never touch our servers.</p>
            {error && <p className="text-rose-400 text-xs mt-1.5 font-medium">⚠ {error}</p>}
          </div>
        </div>
        <button
          onClick={onConnect}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-2.5 px-6 py-2.5 rounded-full font-bold text-sm text-black
            bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <FaSpotify />
              Connect Spotify
            </>
          )}
        </button>
      </div>
    </div>
  );
}
