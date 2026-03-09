import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../skeletons/Navbar";
import useAnimeData from "../hooks/useAnimeData";

const UpcomingPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("upcoming");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Safe image picker from the Images array
  const getImageUrl = (anime) => {
    if (!anime.Images) return "/placeholder.jpg";
    const jpgImage = anime.Images.find((img) => img.Format === "jpg");
    return jpgImage?.ImageUrl || anime.Images[0]?.ImageUrl || "/placeholder.jpg";
  };

  // Format date with fallback
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBA";
    try {
      return new Date(dateStr).toDateString();
    } catch {
      return "TBA";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text-mal mb-2">Upcoming Anime</h1>
          <p className="text-gray-400">Future anime series and movies yet to air</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {animeList.map((anime, index) =>
            anime.placeholder ? (
              <div
                key={`placeholder-${index}`}
                className="bg-gray-800 rounded-lg h-64 opacity-0"
              />
            ) : (
              <Link
                key={anime.MalId}
                to={`/anime/${anime.MalId}`}
                className="group animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-gray-800 rounded-lg overflow-hidden transition-all group-hover:scale-105 group-hover:shadow-2xl">
                  <div className="relative">
                    <img
                      src={getImageUrl(anime)}
                      alt={anime.Title}
                      className="w-full h-72 object-cover"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                      #{anime.Popularity ?? "N/A"}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-white line-clamp-2 mb-2 group-hover:text-cyan-400 transition-colors">
                      {anime.Title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <span>Airs:</span>
                        <span>{formatDate(anime.Aired?.From)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{anime.Type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Members:</span>
                        <span>{anime.Members?.toLocaleString() ?? "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2 text-cyan-400">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          </div>
        )}
        
        {/* End indicator */}
        {isEnd && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No more anime to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingPage;