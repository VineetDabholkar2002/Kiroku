import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FaArrowLeft,
  FaHeart,
  FaExternalLinkAlt,
  FaFilm,
  FaMicrophone,
  FaStar,
} from "react-icons/fa";

const toLower = (val) => (typeof val === "string" ? val.toLowerCase().trim() : "");

const getCharImg = (char) => {
  if (!char) return "/placeholder-character.jpg";
  return (
    char.images?.webp?.image_url ||
    char.images?.webp?.imageUrl ||
    char.images?.jpg?.large_image_url ||
    char.images?.jpg?.largeImageUrl ||
    char.images?.jpg?.image_url ||
    char.images?.jpg?.imageUrl ||
    (Array.isArray(char.images?.jpg) ? char.images.jpg[0] : null) ||
    "/placeholder-character.jpg"
  );
};

const getAnimePoster = (anime) => {
  if (!anime) return "/placeholder-anime.jpg";
  return (
    anime.images?.jpg?.image_url ||
    anime.images?.jpg?.imageUrl ||
    anime.images?.find?.((i) => i.format?.toLowerCase() === "jpg")?.imageUrl ||
    "/placeholder-anime.jpg"
  );
};

const getVaImg = (person) => {
  if (!person) return "/placeholder-person.jpg";
  return (
    person.images?.jpg?.image_url ||
    person.images?.jpg?.imageUrl ||
    (Array.isArray(person.images?.jpg) ? person.images.jpg[0] : null) ||
    "/placeholder-person.jpg"
  );
};

const CharacterPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAbout, setExpandedAbout] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/api/v1/character/${id}`);
        setCharacter(data);
      } catch (err) {
        console.error("Failed to load character details", err);
        setError("Character not found or failed to load.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCharacter();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Skeleton back */}
          <div className="w-24 h-8 bg-white/[0.05] rounded-xl animate-pulse mb-8" />

          {/* Skeleton Hero */}
          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="w-48 sm:w-56 aspect-[3/4] bg-white/[0.05] rounded-2xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-10 w-2/3 bg-white/[0.05] rounded-xl animate-pulse" />
              <div className="h-6 w-1/3 bg-white/[0.05] rounded-lg animate-pulse" />
              <div className="h-20 w-full bg-white/[0.05] rounded-xl animate-pulse" />
            </div>
          </div>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-white/[0.05] rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-white/[0.08] bg-[#0c121d] text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Character Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">
            {error || "The character details you requested could not be found."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm transition-all shadow-rose-500/20"
          >
            <FaArrowLeft className="text-xs" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const animeList = character.anime || [];
  const rawVoiceActors = character.voice_actors || character.voiceActors || [];
  const voiceActors = [...rawVoiceActors].sort((a, b) => {
    const isJpA = toLower(a.language) === "japanese";
    const isJpB = toLower(b.language) === "japanese";
    if (isJpA && !isJpB) return -1;
    if (!isJpA && isJpB) return 1;
    return 0;
  });
  const charImg = getCharImg(character);

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation back button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all mb-8 cursor-pointer"
        >
          <FaArrowLeft className="text-xs" /> Back
        </button>

        {/* ─── Hero Header ──────────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row gap-8 items-start mb-14 p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0c121d]/80 backdrop-blur-xl shadow-2xl">
          {/* Portrait Image */}
          <div className="relative w-48 sm:w-56 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.12] bg-black/40 shadow-xl mx-auto md:mx-0">
            <img
              src={charImg}
              alt={character.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                e.target.src = "/placeholder-character.jpg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                Character
              </span>
              {character.mal_id && (
                <span className="text-[11px] font-semibold text-gray-400 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                  MAL #{character.mal_id}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {character.name}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {character.favorites != null && character.favorites > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
                  <FaHeart className="text-pink-400 text-xs" />
                  <span>{Number(character.favorites).toLocaleString()} Favorites</span>
                </div>
              )}

              {animeList.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                  <FaFilm className="text-rose-400 text-xs" />
                  <span>{animeList.length} Anime Appearances</span>
                </div>
              )}

              {voiceActors.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                  <FaMicrophone className="text-purple-400 text-xs" />
                  <span>{voiceActors.length} Voice Actors</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {character.url && (
                <a
                  href={character.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-gray-200 transition-all hover:scale-[1.02]"
                >
                  <FaExternalLinkAlt className="text-[11px]" /> View on MyAnimeList
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ─── Character Biography / About ──────────────────────────────── */}
        {character.about && character.about.trim().length > 0 && (
          <section className="mb-14 p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#0c121d]/80 backdrop-blur-xl shadow-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5 mb-4">
              <span
                className="w-1 h-5 rounded-full shrink-0"
                style={{ background: "linear-gradient(to bottom, #3b82f6, #06b6d4)" }}
              />
              Biography / About
            </h2>
            <div className="text-sm text-gray-300 leading-relaxed font-normal whitespace-pre-line space-y-2">
              {expandedAbout || character.about.length <= 600
                ? character.about
                : `${character.about.slice(0, 600)}...`}
            </div>
            {character.about.length > 600 && (
              <button
                onClick={() => setExpandedAbout(!expandedAbout)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                {expandedAbout ? "Show Less ▲" : "Read More ▼"}
              </button>
            )}
          </section>
        )}

        {/* ─── Anime Appearances ────────────────────────────────────────── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span
                className="w-1 h-5 rounded-full shrink-0"
                style={{ background: "linear-gradient(to bottom, #3b82f6, #8b5cf6)" }}
              />
              Anime Appearances
            </h2>
            <span className="text-xs text-gray-400 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
              {animeList.length}
            </span>
          </div>

          {animeList.length === 0 ? (
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#0c121d]/50 text-center text-sm text-gray-400">
              No anime appearances found for this character.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {animeList.map((entry, idx) => {
                const anime = entry.anime;
                if (!anime) return null;
                const malId = anime.mal_id || anime.malId || anime.id;
                const poster = getAnimePoster(anime);
                const isMainRole = toLower(entry.role) === "main";

                return (
                  <Link
                    key={`${malId}-${idx}`}
                    to={`/anime/${malId}`}
                    className="group relative flex flex-col rounded-xl overflow-hidden border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.22] hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl"
                  >
                    {/* Poster */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
                      <img
                        src={poster}
                        alt={anime.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = "/placeholder-anime.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-transparent opacity-90" />

                      {/* Role Badge */}
                      <span
                        className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${
                          isMainRole
                            ? "bg-rose-600/80 border-rose-400/30 text-white"
                            : "bg-black/60 border-white/10 text-gray-300"
                        }`}
                      >
                        {entry.role || "Supporting"}
                      </span>

                      {/* Score Badge */}
                      {anime.score != null && anime.score > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-amber-300 border border-white/10">
                          <FaStar className="text-[9px]" />
                          <span>{Number(anime.score).toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors">
                        {anime.title_english || anime.title}
                      </h3>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                        <span>{anime.type || "Anime"}</span>
                        <span>{anime.year || ""}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Voice Actors ─────────────────────────────────────────────── */}
        {voiceActors.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <span
                  className="w-1 h-5 rounded-full shrink-0"
                  style={{ background: "linear-gradient(to bottom, #ec4899, #8b5cf6)" }}
                />
                Voice Actors (Seiyuu)
              </h2>
              <span className="text-xs text-gray-400 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
                {voiceActors.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {voiceActors.map((va, idx) => {
                const person = va.person;
                if (!person) return null;
                const photo = getVaImg(person);
                const isJapanese = toLower(va.language) === "japanese";

                return (
                  <Link
                    key={`${person.mal_id || person.id || idx}`}
                    to={person.mal_id || person.id ? `/person/${person.mal_id || person.id}` : "#"}
                    className="flex items-center gap-3.5 p-3 rounded-2xl border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.22] hover:-translate-y-0.5 transition-all group"
                  >
                    <img
                      src={photo}
                      alt={person.name}
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-white/10 group-hover:ring-purple-400/50 transition-all"
                      onError={(e) => {
                        e.target.src = "/placeholder-person.jpg";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-200 truncate group-hover:text-purple-300 transition-colors">
                        {person.name}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                          isJapanese
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                            : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        }`}
                      >
                        {va.language || "Unknown"}
                      </span>
                    </div>

                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors pr-1">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CharacterPage;
