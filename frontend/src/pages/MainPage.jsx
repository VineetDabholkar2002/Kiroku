import { useEffect } from "react";
import AnimeSlider from "../skeletons/AnimeSlider";
import Navbar from "../skeletons/Navbar";

const MainPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-800 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 gradient-text-mal">
            Kiroku
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Discover new series, trending anime and more...
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-lg font-semibold hover:shadow-lg transition-all">
              Explore Popular
            </button>
            <button className="px-8 py-3 border border-gray-500 rounded-lg font-semibold hover:bg-gray-800 transition-all">
              Search Anime
            </button>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        <AnimeSlider rankingType="bypopularity" title="Trending" />
        <AnimeSlider rankingType="top-rated" title="Top Rated" />
        <AnimeSlider rankingType="airing" title="Currently Airing" />
        <AnimeSlider rankingType="upcoming" title="Upcoming" />
      </div>
    </div>
  );
};

export default MainPage;