import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSpotify } from "../context/SpotifyContext";

const SpotifyCallback = () => {
  const { handleCallback } = useSpotify();
  const [searchParams]     = useSearchParams();
  const navigate           = useNavigate();
  const calledRef          = useRef(false); // prevent StrictMode double-fire

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code  = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      // User denied permission or Spotify returned an error
      navigate("/?spotify_error=" + encodeURIComponent(error));
      return;
    }

    if (!code || !state) {
      navigate("/");
      return;
    }

    handleCallback(code, state).then(() => {
      navigate("/playlist");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-xl text-gray-300">Connecting your Spotify account…</p>
    </div>
  );
};

export default SpotifyCallback;