import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const AnimeSlider = ({ rankingType, title }) => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const getEndpoint = () => {
    switch (rankingType) {
      case "bypopularity":
        return "/api/v1/anime/popular";
      case "top-rated":
        return "/api/v1/anime/top-rated";
      case "airing":
        return "/api/v1/anime/airing";
      case "upcoming":
        return "/api/v1/anime/upcoming";
      case "favorite":
        return "/api/v1/anime/favourites";
      default:
        return "/api/v1/anime/popular";
    }
  };

  useEffect(() => {
    const fetchAnimeData = async () => {
      try {
        setLoading(true);
        const endpoint = getEndpoint();
        const response = await axios.get(endpoint, {
          params: { page, per_page: 12 },
        });
        setAnimeList(response.data.data);
        console.log("Fetched anime data:", response.data.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimeData();
  }, [rankingType, page]);

  const getImageUrl = (anime) => {
    return (
      anime.Images?.find((img) => img.Format === "jpg")?.ImageUrl ||
      anime.Images?.[0]?.ImageUrl ||
      "/placeholder-anime.jpg"
    );
  };

  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6 px-4">{title}</h2>
        <div className="flex gap-4 px-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 animate-shimmer rounded-lg h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6 px-4 gradient-text-mal">{title}</h2>
      <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
        {animeList.map((anime) => (
          <Link
            key={anime.Id || anime.MalId}
            to={`/anime/${anime.MalId}`}
            className="flex-shrink-0 w-48 group animate-fadeIn"
          >
            <div className="relative overflow-hidden rounded-lg bg-gray-800 transition-all group-hover:scale-105 group-hover:shadow-2xl">
              <img
                src={getImageUrl(anime)}
                alt={anime.Title}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.target.src = "/placeholder-anime.jpg";
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 drop-shadow-lg">
                  {anime.Title}
                </h3>
                <div className="flex items-center justify-between text-xs text-gray-300 drop-shadow-md">
                  <span>
                    {anime.Type} • {anime.Year}
                  </span>
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {anime.Score ? anime.Score.toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AnimeSlider;