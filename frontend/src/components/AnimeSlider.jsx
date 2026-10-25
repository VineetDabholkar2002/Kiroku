import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaStar, FaArrowRight } from "react-icons/fa";
import api from "../services/api";

const AnimeSlider = ({ rankingType, title }) => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  const getEndpointAndRoute = () => {
    switch (rankingType) {
      case "bypopularity":
        return { endpoint: "/api/v1/anime/popular", route: "/popular" };
      case "top-rated":
        return { endpoint: "/api/v1/anime/top-rated", route: "/top-rated" };
      case "airing":
        return { endpoint: "/api/v1/anime/airing", route: "/airing" };
      case "upcoming":
        return { endpoint: "/api/v1/anime/upcoming", route: "/upcoming" };
      case "favorite":
        return { endpoint: "/api/v1/anime/favourites", route: "/favourites" };
      default:
        return { endpoint: "/api/v1/anime/popular", route: "/popular" };
    }
  };

  const { endpoint, route } = getEndpointAndRoute();

  useEffect(() => {
    let isCancelled = false;
    const fetchAnimeData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(endpoint, { params: { page: 1, per_page: 16 } });
        if (!isCancelled && data?.data) {
          setAnimeList(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch anime slider data:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchAnimeData();
    return () => { isCancelled = true; };
  }, [endpoint]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -500 : 500;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const getImageUrl = (anime) => {
    const images = anime?.images || anime?.Images;
    return (
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "jpg")?.imageUrl ||
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "webp")?.imageUrl ||
      images?.find((img) => (img.format || img.Format)?.toLowerCase() === "webp")?.ImageUrl ||
      images?.[0]?.imageUrl ||
      images?.[0]?.ImageUrl ||
      "/placeholder-anime.jpg"
    );
  };

  if (loading) {
    return (
      <div className="py-5">
        <div className="flex items-center justify-between mb-3 px-4 md:px-0">
          <div className="h-5 w-36 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4 md:px-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-36 sm:w-44 shrink-0">
              <div className="w-full aspect-[2/3] bg-slate-800/60 rounded-lg animate-pulse border border-slate-800" />
              <div className="mt-2 space-y-1.5">
                <div className="h-3.5 bg-slate-800/80 rounded w-4/5 animate-pulse" />
                <div className="h-3 bg-slate-800/50 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (animeList.length === 0) return null;

  return (
    <section className="py-5 group/slider">
      {/* Rail Header */}
      <div className="flex items-center justify-between mb-3.5 px-4 md:px-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full" />
          <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={route}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
          >
            <span>View All</span>
            <FaArrowRight className="text-[10px]" />
          </Link>

          {/* Desktop Left/Right Scroll Buttons */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition"
            >
              <FaChevronLeft className="text-[10px]" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition"
            >
              <FaChevronRight className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Rail Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth px-4 md:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {animeList.map((anime) => {
          const malId = anime.malId ?? anime.MalId;
          const id = anime.id ?? anime.Id;
          const titleText = anime.title ?? anime.Title ?? "Untitled";
          const score = anime.score ?? anime.Score;
          const type = anime.type ?? anime.Type;
          const year = anime.year ?? anime.Year;

          return (
            <Link
              key={id ?? malId}
              to={`/anime/${malId}`}
              className="group/card w-36 sm:w-44 shrink-0 block"
            >
              {/* Poster Frame */}
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 border border-slate-800/80 group-hover/card:border-blue-500/50 shadow-sm transition-all duration-300 group-hover/card:-translate-y-1">
                <img
                  src={getImageUrl(anime)}
                  alt={titleText}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/placeholder-anime.jpg";
                  }}
                />

                {/* Score Pill */}
                {score != null && score > 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-sm border border-white/10 text-amber-400 text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    <FaStar className="text-[9px]" />
                    <span>{Number(score).toFixed(1)}</span>
                  </div>
                )}

                {/* Format Tag */}
                {type && (
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase">
                    {type}
                  </div>
                )}

                {/* Bottom subtle shadow gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              </div>

              {/* Title & Metadata below poster */}
              <div className="mt-2.5">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover/card:text-rose-400 line-clamp-1 transition-colors leading-snug">
                  {titleText}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>{type || "Anime"}</span>
                  {year && <span>{year}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default AnimeSlider;
