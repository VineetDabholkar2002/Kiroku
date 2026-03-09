import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar from "../skeletons/Navbar";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [animeList, setAnimeList] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEnd, setIsEnd] = useState(false);
  const timer = useRef(null);

  const fetchSearchResults = useCallback(
    async () => {
      if (loading || !query.trim()) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/v1/anime/search`, {
          params: { query, page },
        });

        const newItems = response.data.data;
        if (newItems.length === 0) {
          setIsEnd(true);
        } else {
          setAnimeList((prev) => [...prev, ...newItems]);
        }
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoading(false);
      }
    },
    [loading, query, page]
  );

  // Use a single useEffect for both debounce and fetching
  useEffect(() => {
    // Clear the previous timer
    if (timer.current) clearTimeout(timer.current);

    // If the query is empty, clear the list and exit
    if (!query.trim()) {
      setAnimeList([]);
      setLoading(false);
      return;
    }

    // Set a new timer to fetch data after a delay
    timer.current = setTimeout(() => {
      // Reset state for a new search
      setPage(1);
      setIsEnd(false);
      setAnimeList([]);
      fetchSearchResults();
    }, 500);

    // Cleanup function to clear the timer
    return () => clearTimeout(timer.current);
  }, [query]);

  // Fetch more results on page change (for infinite scroll)
  useEffect(() => {
    if (page > 1) {
      fetchSearchResults();
    }
  }, [page, fetchSearchResults]);

  // Scroll handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.scrollHeight - 100
      ) {
        if (!loading && !isEnd) {
          setPage((prev) => prev + 1);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, isEnd]);

  // Pick image from the Images array
  const getImageUrl = (anime) => {
    return (
      anime.Images?.find((img) => img.Format === "jpg")?.ImageUrl ||
      anime.Images?.[0]?.ImageUrl ||
      "/placeholder-anime.jpg"
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text-mal mb-2">Search Anime</h1>
          <p className="text-gray-400">Find your next favorite anime</p>
        </div>
        <div className="mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anime..."
            aria-label="Search for anime"
            className="w-full p-4 rounded-lg bg-gray-800 text-gray-200 text-lg outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {animeList.map((anime, index) => (
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
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-anime.jpg";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                    ⭐ {anime.Score ?? "N/A"}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-white line-clamp-2 mb-2 group-hover:text-cyan-400 transition-colors">
                    {anime.Title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Popularity:</span>
                      <span className="text-orange-400">#{anime.Popularity ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Members:</span>
                      <span>{anime.Members?.toLocaleString() ?? "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{anime.Type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
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
            <p className="text-gray-500">No more results found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;