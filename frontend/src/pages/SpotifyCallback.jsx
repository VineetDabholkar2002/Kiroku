import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSpotify } from "../context/SpotifyContext";

const SpotifyCallback = () => {
  const { handleCallback } = useSpotify();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      handleCallback(code, state).then(() => {
        // Redirect to the playlist page or homepage after successful login
        navigate("/playlist");
      });
    } else {
      // Missing code/state, redirect to home or login
      navigate("/");
    }
  }, [handleCallback, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <p className="text-xl">Completing Spotify login, please wait...</p>
    </div>
  );
};

export default SpotifyCallback;
