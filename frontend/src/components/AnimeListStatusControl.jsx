import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export const ANIME_LIST_STATUSES = [
  "Watching",
  "Completed",
  "Plan to Watch",
  "Dropped",
];

export default function AnimeListStatusControl({
  animeMalId,
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
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setStatus(initialStatus || "");
    setScore(initialScore ?? 0);
    setDraftStatus(initialStatus || "Watching");
    setDraftScore(initialScore ?? 0);
  }, [initialScore, initialStatus]);

  const handleSave = async () => {
    if (!username) return;

    try {
      setSaving(true);
      setMessage("");
      const { data } = await axios.put(`/api/v1/user/by-username/${username}/anime-list`, {
        animeMalId,
        status: draftStatus,
        score: draftScore,
      });
      setStatus(data.status);
      setScore(data.score ?? 0);
      setDraftStatus(data.status);
      setDraftScore(data.score ?? 0);
      setMessage("Saved");
      setOpen(false);
      onStatusChange?.(data.status, data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(""), 1800);
    }
  };

  return (
    <>
      <div className={compact ? "flex items-center justify-end gap-2" : "flex items-center gap-3"}>
        {!compact && status && (
          <div className="text-sm">
            <p className="text-white font-medium">{status}</p>
            <p className="text-xs text-gray-500">Score {score}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15 text-blue-300 transition hover:bg-blue-500/25 hover:text-white ${
            compact ? "h-9 w-9" : "h-11 w-11"
          }`}
          aria-label={status ? "Edit anime list entry" : "Add anime to list"}
        >
          <FaPlus className={compact ? "text-xs" : "text-sm"} />
        </button>
      </div>

      {message && <p className={`mt-2 text-xs ${message === "Saved" ? "text-emerald-300" : "text-red-300"}`}>{message}</p>}

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0c121d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{status ? "Update list entry" : "Add to list"}</h3>
                <p className="text-sm text-gray-500">Choose watch status and score.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-500 transition hover:text-white">
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Watch status
                </label>
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  {ANIME_LIST_STATUSES.map((option) => (
                    <option key={option} value={option} className="bg-slate-900">
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Score
                </label>
                <select
                  value={draftScore}
                  onChange={(event) => setDraftScore(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  {Array.from({ length: 11 }, (_, value) => (
                    <option key={value} value={value} className="bg-slate-900">
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-gray-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
