import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FaArrowLeft,
  FaExternalLinkAlt,
  FaMicrophone,
  FaStar,
} from "react-icons/fa";

const toLower = (val) => (typeof val === "string" ? val.toLowerCase().trim() : "");

const getPersonImg = (person) => {
  if (!person) return "/placeholder-person.jpg";
  return (
    person.images?.jpg?.image_url ||
    person.images?.jpg?.imageUrl ||
    (Array.isArray(person.images?.jpg) ? person.images.jpg[0] : null) ||
    "/placeholder-person.jpg"
  );
};

const getAnimeImg = (anime) => {
  if (!anime) return "/placeholder-anime.jpg";
  return (
    anime.images?.jpg?.image_url ||
    anime.images?.jpg?.imageUrl ||
    "/placeholder-anime.jpg"
  );
};

const getCharImg = (character) => {
  if (!character) return "/placeholder-character.jpg";
  return (
    character.images?.jpg?.image_url ||
    character.images?.jpg?.imageUrl ||
    (Array.isArray(character.images?.jpg) ? character.images.jpg[0] : null) ||
    "/placeholder-character.jpg"
  );
};

export default function PersonPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLang, setSelectedLang] = useState("all");

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPerson = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/api/v1/person/${id}`);
        setPerson(data);
      } catch (err) {
        console.error("Failed to load person details", err);
        setError("Voice actor details not found.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPerson();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="w-24 h-8 bg-white/[0.05] rounded-xl animate-pulse mb-8" />
          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="w-48 sm:w-56 aspect-[3/4] bg-white/[0.05] rounded-2xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-10 w-2/3 bg-white/[0.05] rounded-xl animate-pulse" />
              <div className="h-6 w-1/3 bg-white/[0.05] rounded-lg animate-pulse" />
              <div className="h-20 w-full bg-white/[0.05] rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-white/[0.05] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-white/[0.08] bg-[#0c121d] text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Person Not Found</h2>
          <p className="text-sm text-gray-400 mb-6">
            {error || "The voice actor or staff member could not be found."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-sm transition-all shadow-rose-500/20 cursor-pointer"
          >
            <FaArrowLeft className="text-xs" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const voiceRoles = person.voice_roles || [];
  const photo = getPersonImg(person);

  // Group languages for filter pills (safely ensuring string values)
  const availableLangs = Array.from(
    new Set(
      voiceRoles
        .map((r) => (typeof r.language === "string" ? r.language.trim() : ""))
        .filter(Boolean)
    )
  );

  const filteredRoles =
    toLower(selectedLang) === "all"
      ? voiceRoles
      : voiceRoles.filter(
          (r) => toLower(r.language) === toLower(selectedLang)
        );

  const isJapaneseVa =
    toLower(person.primary_language) === "japanese" ||
    availableLangs.some((l) => toLower(l) === "japanese");

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px]" />
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
          {/* Portrait Photo */}
          <div className="relative w-48 sm:w-56 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.12] bg-black/40 shadow-xl mx-auto md:mx-0">
            <img
              src={photo}
              alt={person.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                e.target.src = "/placeholder-person.jpg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isJapaneseVa
                  ? "text-rose-300 bg-rose-500/10 border-rose-500/20"
                  : "text-purple-400 bg-purple-500/10 border-purple-500/20"
              }`}>
                {isJapaneseVa ? "Japanese Voice Actor (Seiyuu)" : `${person.primary_language || "Voice"} Actor`}
              </span>
              {person.mal_id && (
                <span className="text-[11px] font-semibold text-gray-400 bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                  MAL #{person.mal_id}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              {person.name}
            </h1>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {voiceRoles.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                  <FaMicrophone className="text-purple-400 text-xs" />
                  <span>{voiceRoles.length} Voice Acting Roles</span>
                </div>
              )}
            </div>

            {/* External MAL Link */}
            {person.url && (
              <div>
                <a
                  href={person.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-gray-200 transition-all hover:scale-[1.02]"
                >
                  <FaExternalLinkAlt className="text-[11px]" /> View on MyAnimeList
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ─── Voice Acting & Anime Roles ───────────────────────────────── */}
        <section className="mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span
                className="w-1 h-5 rounded-full shrink-0"
                style={{ background: "linear-gradient(to bottom, #ec4899, #8b5cf6)" }}
              />
              <h2 className="text-xl font-bold text-white">
                Anime Voice Roles & Works
              </h2>
              <span className="text-xs text-gray-400 bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/[0.08]">
                {filteredRoles.length}
              </span>
            </div>

            {/* Language filter pills */}
            {availableLangs.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] self-start sm:self-auto">
                <button
                  onClick={() => setSelectedLang("all")}
                  className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                    toLower(selectedLang) === "all"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({voiceRoles.length})
                </button>
                {availableLangs.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${
                      toLower(selectedLang) === toLower(lang)
                        ? "bg-purple-600 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {lang} ({voiceRoles.filter((r) => toLower(r.language) === toLower(lang)).length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredRoles.length === 0 ? (
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#0c121d]/50 text-center text-sm text-gray-400">
              No anime voice roles found matching the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRoles.map((roleEntry, idx) => {
                const anime = roleEntry.anime;
                const char = roleEntry.character;
                const animeMalId = anime?.mal_id || anime?.id;
                const charMalId = char?.mal_id || char?.id;
                const isMainRole = toLower(char?.role) === "main";

                return (
                  <div
                    key={`${animeMalId}-${charMalId}-${idx}`}
                    className="flex flex-col rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.22] hover:-translate-y-1 transition-all duration-300 shadow-md group"
                  >
                    {/* Anime Section */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                      <Link to={`/anime/${animeMalId}`} className="block w-full h-full">
                        <img
                          src={getAnimeImg(anime)}
                          alt={anime?.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.src = "/placeholder-anime.jpg";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-[#0c121d]/40 to-transparent" />
                      </Link>

                      {/* Anime score badge */}
                      {anime?.score != null && anime.score > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-amber-300 border border-white/10 backdrop-blur-md">
                          <FaStar className="text-[9px]" />
                          <span>{Number(anime.score).toFixed(1)}</span>
                        </div>
                      )}

                      {/* Language tag */}
                      {roleEntry.language && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600/80 border border-purple-400/30 text-white backdrop-blur-md">
                          {roleEntry.language}
                        </span>
                      )}

                      {/* Anime Title */}
                      <div className="absolute bottom-2 left-3 right-3">
                        <Link
                          to={`/anime/${animeMalId}`}
                          className="text-xs font-bold text-white line-clamp-1 hover:text-rose-400 transition-colors"
                        >
                          {anime?.title || anime?.title_english}
                        </Link>
                        {anime?.title_english && anime.title_english !== anime.title && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {anime.title_english}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Character Section */}
                    <div className="p-3 flex items-center gap-3 border-t border-white/[0.06] bg-white/[0.02]">
                      <Link
                        to={`/character/${charMalId}`}
                        className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-400/50 transition-colors"
                      >
                        <img
                          src={getCharImg(char)}
                          alt={char?.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.target.src = "/placeholder-character.jpg";
                          }}
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/character/${charMalId}`}
                          className="block text-xs font-bold text-gray-200 truncate hover:text-rose-400 transition-colors"
                        >
                          {char?.name || "Unknown Character"}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-medium capitalize ${
                              isMainRole ? "text-rose-400" : "text-gray-400"
                            }`}
                          >
                            {char?.role || "Supporting"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
