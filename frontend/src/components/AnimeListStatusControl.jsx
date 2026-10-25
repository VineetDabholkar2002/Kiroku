import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaPlus,
  FaCheck,
  FaPlay,
  FaClock,
  FaTimes,
  FaTrashAlt,
  FaStar,
  FaPen,
  FaBookmark,
  FaChevronDown,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export const ANIME_LIST_STATUSES = [
  "Watching",
  "Completed",
  "Plan to Watch",
  "Dropped",
];

const SCORE_LABELS = {
  0: "No Score",
  1: "Appalling",
  2: "Horrible",
  3: "Very Bad",
  4: "Bad",
  5: "Average",
  6: "Fine",
  7: "Good",
  8: "Very Good",
  9: "Great",
  10: "Masterpiece",
};

const STATUS_CONFIG = {
  Watching: {
    label: "Watching",
    color: "text-emerald-300 border-emerald-500/60 bg-[#090d16]/95 hover:border-emerald-400 hover:bg-[#0e1624] shadow-md",
    dot: "bg-emerald-400 shadow-[0_0_6px_#34d399]",
    icon: FaPlay,
  },
  Completed: {
    label: "Completed",
    color: "text-indigo-300 border-indigo-500/60 bg-[#090d16]/95 hover:border-indigo-400 hover:bg-[#0e1624] shadow-md",
    dot: "bg-indigo-400 shadow-[0_0_6px_#818cf8]",
    icon: FaCheck,
  },
  "Plan to Watch": {
    label: "Plan to Watch",
    color: "text-sky-300 border-sky-500/60 bg-[#090d16]/95 hover:border-sky-400 hover:bg-[#0e1624] shadow-md",
    dot: "bg-sky-400 shadow-[0_0_6px_#38bdf8]",
    icon: FaClock,
  },
  Dropped: {
    label: "Dropped",
    color: "text-rose-300 border-rose-500/60 bg-[#090d16]/95 hover:border-rose-400 hover:bg-[#0e1624] shadow-md",
    dot: "bg-rose-400 shadow-[0_0_6px_#fb7185]",
    icon: FaTimes,
  },
};

export default function AnimeListStatusControl({
  animeMalId,
  animeTitle = "",
  initialStatus = "",
  initialScore = 0,
  onStatusChange,
  compact = false,
}) {
  const { username } = useAuth();
  const [status, setStatus] = useState(initialStatus || "");
  const [score, setScore] = useState(initialScore ?? 0);
  const [draftStatus, setDraftStatus] = useState(initialStatus || "Watching");
  const [draftScore, setDraftScore] = useState(initialScore ?? 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStatus(initialStatus || "");
    setScore(initialScore ?? 0);
    setDraftStatus(initialStatus || "Watching");
    setDraftScore(initialScore ?? 0);
  }, [initialScore, initialStatus]);

  const handleOpen = () => {
    setDraftStatus(status || "Watching");
    setDraftScore(score ?? 0);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!username) return;

    try {
      setSaving(true);
      setMessage("");
      const { data } = await api.put(`/api/v1/user/by-username/${username}/anime-list`, {
        animeMalId,
        status: draftStatus,
        score: draftScore,
      });
      setStatus(data.status);
      setScore(data.score ?? 0);
      setDraftStatus(data.status);
      setDraftScore(data.score ?? 0);
      setMessage("Updated watchlist");
      setOpen(false);
      onStatusChange?.(data.status, data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update list");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(""), 2200);
    }
  };

  const handleDelete = async () => {
    if (!username || !animeMalId) return;

    try {
      setDeleting(true);
      setMessage("");
      await api.delete(`/api/v1/user/by-username/${username}/anime-list/${animeMalId}`);
      setStatus("");
      setScore(0);
      setDraftStatus("Watching");
      setDraftScore(0);
      setMessage("Removed from watchlist");
      setOpen(false);
      onStatusChange?.("", { status: "", score: 0 });
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to remove entry");
    } finally {
      setDeleting(false);
      window.setTimeout(() => setMessage(""), 2200);
    }
  };

  const currentCfg = STATUS_CONFIG[status];

  return (
    <>
      {/* ── Action Trigger ── */}
      <div className={compact ? "inline-flex items-center" : "flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"}>
        {!status ? (
          // Not in list state
          <button
            type="button"
            onClick={handleOpen}
            className={`group inline-flex items-center justify-center font-bold transition-all duration-200 select-none ${
              compact
                ? "gap-1.5 px-2.5 py-1 rounded-md text-[11px] bg-[#090d16]/95 hover:bg-rose-600 text-white border border-rose-500/60 hover:border-rose-400 shadow-md backdrop-blur-md"
                : "gap-2.5 px-5 py-3 rounded-xl text-sm bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white shadow-lg shadow-rose-500/20 hover:from-rose-500 hover:via-pink-500 hover:to-rose-600 hover:shadow-rose-500/30 active:scale-[0.98]"
            }`}
          >
            <FaPlus className={compact ? "text-[9px]" : "text-xs group-hover:rotate-90 transition-transform duration-300"} />
            <span>{compact ? "Watchlist" : "Add to Watchlist"}</span>
          </button>
        ) : (
          // Already in list state
          <button
            type="button"
            onClick={handleOpen}
            className={`group inline-flex items-center justify-between transition-all duration-200 select-none border backdrop-blur-md ${
              compact
                ? "gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#090d16]/95 hover:bg-[#121927]"
                : "gap-3 px-4 py-2.5 rounded-xl text-sm bg-white/[0.04] hover:bg-white/[0.08]"
            } ${currentCfg ? currentCfg.color : "text-gray-300 border-white/20 bg-[#090d16]/95"}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentCfg ? currentCfg.dot : "bg-gray-400"} shrink-0`} />
              <span className="font-bold text-white whitespace-nowrap">{status}</span>
            </div>

            {score > 0 ? (
              <div className="flex items-center gap-0.5 pl-1.5 border-l border-white/20 text-[10px] text-amber-300 font-black">
                <FaStar className="text-[8px]" />
                <span>{score}</span>
              </div>
            ) : !compact ? (
              <span className="text-gray-500 text-xs font-medium pl-2 border-l border-white/10">Unrated</span>
            ) : null}

            {!compact && (
              <FaPen className="text-[10px] text-gray-400 opacity-60 group-hover:opacity-100 group-hover:text-white transition-opacity ml-1" />
            )}
          </button>
        )}

        {message && (
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium transition-opacity ${
            message.includes("Removed") ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
          }`}>
            {message}
          </span>
        )}
      </div>

      {/* ── Modal Popover ── */}
      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0c121d] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaBookmark className="text-rose-400 text-sm" />
                  {status ? "Edit Watchlist Entry" : "Add to Watchlist"}
                </h3>
                {animeTitle && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{animeTitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.08] transition"
              >
                ✕
              </button>
            </div>

            {!username ? (
              // Not authenticated warning
              <div className="py-8 text-center space-y-4">
                <p className="text-sm text-gray-300">
                  You need to be logged in to track and save anime to your personal list.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm transition shadow-sm shadow-rose-500/20"
                >
                  Log in to Kiroku
                </Link>
              </div>
            ) : (
              // Authenticated Form
              <div className="py-5 space-y-5">
                {/* Status Segmented Buttons */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    Watch Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ANIME_LIST_STATUSES.map((option) => {
                      const cfg = STATUS_CONFIG[option];
                      const isSelected = draftStatus === option;
                      const Icon = cfg?.icon || FaCheck;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setDraftStatus(option)}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            isSelected
                              ? `${cfg.color} border-current ring-1 ring-current/30 shadow-sm`
                              : "border-white/[0.08] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                          }`}
                        >
                          <Icon className={`text-xs ${isSelected ? "opacity-100" : "opacity-60"}`} />
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Score Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Your Score
                    </label>
                    <span className="text-xs font-semibold text-rose-300">
                      {draftScore > 0 ? `${draftScore} / 10 · ${SCORE_LABELS[draftScore]}` : "Unrated"}
                    </span>
                  </div>

                  {/* 10-score buttons grid */}
                  <div className="grid grid-cols-10 gap-1 mb-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => {
                      const isSelected = draftScore === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDraftScore(draftScore === s ? 0 : s)}
                          className={`h-9 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-yellow-400 text-black shadow-md shadow-yellow-400/20 scale-105"
                              : "bg-white/[0.05] border border-white/[0.06] text-gray-300 hover:bg-white/[0.1] hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {draftScore > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftScore(0)}
                      className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear rating
                    </button>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                  {status ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || saving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition disabled:opacity-50"
                    >
                      <FaTrashAlt className="text-[10px]" />
                      <span>{deleting ? "Removing..." : "Remove"}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 rounded-xl border border-white/[0.08] text-xs font-medium text-gray-400 hover:bg-white/[0.05] hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || deleting}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Entry"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
