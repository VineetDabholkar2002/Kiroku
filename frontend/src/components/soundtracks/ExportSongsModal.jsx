import React from "react";
import { FaCopy } from "react-icons/fa";

export default function ExportSongsModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <FaCopy className="text-emerald-400" /> Export Playlist
        </h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          If Spotify blocks you from logging in directly, you can easily create your playlist using a free third-party tool!
        </p>

        <ol className="list-decimal list-inside text-sm text-gray-400 space-y-3 mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <li>Click <strong>Copy & Open TuneMyMusic</strong> below.</li>
          <li>Go to <a href="https://www.tunemymusic.com/transfer" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">TuneMyMusic.com</a>.</li>
          <li>Select <strong>From File / Free Text</strong> and paste your copied list.</li>
          <li>Select <strong>Spotify</strong> as your destination to finish!</li>
        </ol>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <FaCopy /> Copy & Open TuneMyMusic
          </button>
        </div>
      </div>
    </div>
  );
}
