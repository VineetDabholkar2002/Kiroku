import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AnimeSlider = ({ rankingType, title }) => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading]     = useState(true);

  const getEndpoint = () => {
    switch (rankingType) {
      case "bypopularity": return "/api/v1/anime/popular";
      case "top-rated":    return "/api/v1/anime/top-rated";
      case "airing":       return "/api/v1/anime/airing";
      case "upcoming":     return "/api/v1/anime/upcoming";
      case "favorite":     return "/api/v1/anime/favourites";
      default:             return "/api/v1/anime/popular";
    }
  };

  useEffect(() => {
    const fetchAnimeData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(getEndpoint(), { params: { page: 1, per_page: 14 } });
        setAnimeList(data.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimeData();
  }, [rankingType]);

  const getImageUrl = (anime) =>
    anime?.Images?.find((img) => img.Format === "jpg")?.ImageUrl ||
    anime?.Images?.[0]?.ImageUrl ||
    "/placeholder-anime.jpg";

  if (loading) {
    return (
      <div className="py-6 px-4 max-w-[100vw]">
        <div className="h-5 w-36 bg-white/[0.06] rounded-full mb-5 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 rounded-xl overflow-hidden border border-white/[0.06] animate-pulse">
              <div className="w-full h-60 bg-white/[0.04]" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-white/[0.06] rounded-full w-4/5" />
                <div className="h-2 bg-white/[0.04] rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h2 className="text-lg font-bold text-white mb-5 px-4 md:px-6">{title}</h2>
      <div className="flex gap-3 px-4 md:px-6 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {animeList.map((anime) => (
          <Link
            key={anime.Id ?? anime.MalId}
            to={`/anime/${anime.MalId}`}
            className="flex-shrink-0 w-44 group"
          >
            <div
              className="relative rounded-xl overflow-hidden border border-white/[0.07] transition-all duration-300
                group-hover:scale-[1.04] group-hover:border-white/[0.2] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
              style={{ background: "linear-gradient(160deg,rgba(255,255,255,0.045) 0%,rgba(255,255,255,0.015) 100%)" }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={getImageUrl(anime)}
                  alt={anime.Title}
                  className="w-full h-60 object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => { e.target.src = "/placeholder-anime.jpg"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                {/* Score badge */}
                {anime.Score && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm border border-white/10 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-lg">
                    ★ {anime.Score.toFixed(1)}
                  </div>
                )}

                {/* Overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-xs font-semibold text-white line-clamp-2 drop-shadow-lg leading-snug">
                    {anime.Title}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {anime.Type}{anime.Year ? ` · ${anime.Year}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AnimeSlider;