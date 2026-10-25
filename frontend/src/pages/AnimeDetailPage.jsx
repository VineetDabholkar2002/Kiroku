import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import AnimeListStatusControl from "../components/AnimeListStatusControl";
import { useAuth } from "../context/AuthContext";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlayCircle,
  FaExternalLinkAlt,
  FaStar,
  FaUsers,
  FaHeart,
  FaTrophy,
  FaShareAlt,
  FaCheck,
  FaTv,
  FaClock,
  FaYoutube,
} from "react-icons/fa";

// ─── Image helpers ────────────────────────────────────────────────────────────

const getPosterUrl = (anime) =>
  anime?.images?.find((i) => i.format === "jpg")?.imageUrl ||
  anime?.images?.find((i) => i.format === "webp")?.imageUrl ||
  anime?.images?.[0]?.imageUrl ||
  "/placeholder-anime.jpg";

const getCharImg = (char) =>
  char?.character?.images?.webp?.image_url ||
  char?.character?.images?.jpg?.image_url ||
  "/placeholder-character.jpg";

const getVaImg = (va) =>
  va?.person?.images?.jpg?.image_url || "/placeholder-person.jpg";

const getRecImg = (rec) =>
  rec?.entry?.images?.jpg?.imageUrl ||
  rec?.entry?.images?.webp?.imageUrl ||
  "/placeholder-anime.jpg";

// ─── Glass card wrapper ───────────────────────────────────────────────────────

const Glass = ({ children, className = "", style = {} }) => (
  <div
    className={`rounded-2xl border border-white/[0.08] bg-[#0c121d]/70 backdrop-blur-md ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ─── Section heading ──────────────────────────────────────────────────────────

const Heading = ({ children, count, id }) => (
  <div id={id} className="flex items-center justify-between mb-5">
    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2.5">
      <span className="w-1 h-4 rounded-full bg-rose-500 shrink-0" />
      {children}
    </h2>
    {count != null && (
      <span className="text-xs font-semibold text-gray-400 bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
        {count}
      </span>
    )}
  </div>
);

// ─── Horizontal scroll container ──────────────────────────────────────────────

const HScroll = ({ id, children }) => {
  const scroll = (dir) =>
    document.getElementById(id)?.scrollBy({ left: dir === "left" ? -440 : 440, behavior: "smooth" });

  return (
    <div className="relative group/s -mx-1 px-1">
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/85 border border-white/10 text-white opacity-0 group-hover/s:opacity-100 transition-all hover:bg-white/20 hover:scale-105"
      >
        <FaChevronLeft size={11} />
      </button>

      <div
        id={id}
        className="flex gap-3.5 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/85 border border-white/10 text-white opacity-0 group-hover/s:opacity-100 transition-all hover:bg-white/20 hover:scale-105"
      >
        <FaChevronRight size={11} />
      </button>
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const Stat = ({ label, value, color = "text-white", icon: Icon }) => (
  <div className="flex-1 min-w-[100px] px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03]">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">
      {Icon && <Icon className="text-xs text-gray-400" />}
      <span>{label}</span>
    </div>
    <div className={`text-base sm:text-lg font-black leading-tight ${color}`}>{value}</div>
  </div>
);

// ─── Genre tag ────────────────────────────────────────────────────────────────

const GenreTag = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:text-white hover:border-white/[0.2] transition-colors"
  >
    {children}
  </Link>
);

// ─── Info spec row ────────────────────────────────────────────────────────────

const InfoRow = ({ label, children }) => (
  <div className="flex gap-4 py-2.5 border-b border-white/[0.05] last:border-0 text-xs">
    <span className="font-semibold text-gray-500 uppercase tracking-wider shrink-0 w-24 pt-0.5">
      {label}
    </span>
    <span className="text-gray-200 leading-relaxed break-words flex-1">{children}</span>
  </div>
);

// ─── Character & Voice Actor Card ─────────────────────────────────────────────

const CharCard = ({ char }) => {
  const vaList = char.voiceActors || char.voice_actors || [];
  // Prioritize Japanese voice actor
  const va =
    vaList.find(
      (v) =>
        (typeof v.language === "string" ? v.language.toLowerCase().trim() : "") ===
        "japanese"
    ) || vaList[0];
  const charId = char.character?.mal_id || char.character?.malId || char.character?.id;
  const personId = va?.person?.mal_id || va?.person?.malId || va?.person?.id;
  const favorites = char.favorites ?? char.character?.favorites ?? 0;

  return (
    <div className="shrink-0 w-36 sm:w-40 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.2] hover:-translate-y-1 transition-all duration-300 shadow-md flex flex-col justify-between group">
      {/* Character image and name link */}
      <Link
        to={charId ? `/character/${charId}` : "#"}
        className="block relative aspect-[3/4] w-full overflow-hidden bg-black/40 cursor-pointer"
        title={`View ${char.character?.name || "Character"} details`}
      >
        <img
          src={getCharImg(char)}
          alt={char.character?.name}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = "/placeholder-character.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-transparent opacity-95" />

        {/* Likes / Favorites badge */}
        {favorites > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-pink-300 border border-white/10 backdrop-blur-md shadow-sm">
            <FaHeart className="text-[8px] text-pink-400" />
            <span>{Number(favorites).toLocaleString()}</span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-xs font-bold line-clamp-1 leading-snug group-hover:text-rose-400 transition-colors">
            {char.character?.name}
          </p>
          <span className="text-[10px] font-medium text-rose-400 capitalize">
            {char.role}
          </span>
        </div>
      </Link>

      {/* Voice actor */}
      {va && (
        <Link
          to={personId ? `/person/${personId}` : "#"}
          className="flex items-center gap-2 p-2.5 border-t border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.07] transition-colors"
          title={`View voice actor ${va.person?.name || "details"}`}
        >
          <img
            src={getVaImg(va)}
            alt={va.person?.name}
            loading="lazy"
            className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/10"
            onError={(e) => {
              e.target.src = "/placeholder-person.jpg";
            }}
          />
          <div className="min-w-0">
            <p className="text-gray-300 text-[11px] font-medium truncate hover:text-purple-300 transition-colors">
              {va.person?.name}
            </p>
            <p className="text-gray-500 text-[9px]">{va.language}</p>
          </div>
        </Link>
      )}
    </div>
  );
};

// ─── Related Anime Card ───────────────────────────────────────────────────────

const RELATION_COLORS = {
  Sequel: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Prequel: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Side story": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Parent story": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Alternative version": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Alternative setting": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Spin-off": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Adaptation: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Summary: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Other: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const RelationCard = ({ entry, relationType }) => {
  const isAnime =
    !entry.entryType ||
    (typeof entry.entryType === "string" ? entry.entryType.toLowerCase() : "") ===
      "anime";
  const badgeStyle = RELATION_COLORS[relationType] || "bg-blue-500/20 text-blue-300 border-blue-500/30";
  const linkTarget = isAnime ? `/anime/${entry.malId}` : entry.url;
  const posterImg = entry.imageUrl || entry.image_url || "/placeholder-anime.jpg";

  const cardContent = (
    <div className="shrink-0 w-36 sm:w-40 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.22] hover:-translate-y-1 transition-all duration-300 shadow-md flex flex-col group h-full">
      {/* Poster image container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
        <img
          src={posterImg}
          alt={entry.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src = "/placeholder-anime.jpg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-transparent opacity-90" />

        {/* Relation type pill */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider backdrop-blur-md ${badgeStyle}`}>
            {relationType}
          </span>
        </div>

        {/* Media type tag */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 text-gray-300 border border-white/10 backdrop-blur-md">
            {entry.entryType || "Anime"}
          </span>
        </div>
      </div>

      {/* Title & Info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h3 className="text-xs font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
          {entry.name}
        </h3>
        <span className="text-[10px] text-gray-500 mt-2 block">
          {isAnime ? "View Details →" : "View on MAL ↗"}
        </span>
      </div>
    </div>
  );

  return isAnime ? (
    <Link to={linkTarget} className="shrink-0 w-36 sm:w-40 block h-full">
      {cardContent}
    </Link>
  ) : (
    <a href={linkTarget} target="_blank" rel="noopener noreferrer" className="shrink-0 w-36 sm:w-40 block h-full">
      {cardContent}
    </a>
  );
};

// ─── Recommendation Card ──────────────────────────────────────────────────────

const RecCard = ({ rec }) => (
  <Link
    to={`/anime/${rec.entry.malId}`}
    className="shrink-0 w-32 sm:w-36 group rounded-xl overflow-hidden border border-white/[0.08] bg-[#0c121d] hover:border-white/[0.2] hover:-translate-y-1 transition-all duration-300 shadow-md"
  >
    <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
      <img
        src={getRecImg(rec)}
        alt={rec.entry.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          e.target.src = "/placeholder-anime.jpg";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-transparent opacity-90" />
      {rec.votes > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
          <FaCheck className="text-[8px] text-emerald-400" />
          {rec.votes}
        </div>
      )}
    </div>
    <div className="p-2.5">
      <p className="text-gray-200 text-xs font-semibold line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
        {rec.entry.title}
      </p>
    </div>
  </Link>
);

// ─── External Link Button ─────────────────────────────────────────────────────

const ExtLink = ({ name, url, streaming }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={`group flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] ${
      streaming
        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40"
        : "bg-white/[0.03] border-white/[0.08] text-gray-300 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.18]"
    }`}
  >
    <div
      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        streaming ? "bg-emerald-500/20" : "bg-white/[0.06]"
      }`}
    >
      {streaming ? (
        <FaPlayCircle className="text-emerald-400 text-sm" />
      ) : (
        <FaExternalLinkAlt className="text-gray-400 text-xs" />
      )}
    </div>
    <span className="flex-1 truncate">{name}</span>
    <FaExternalLinkAlt className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity" />
  </a>
);

// ─── Theme Song Item ──────────────────────────────────────────────────────────

const ThemeLine = ({ index, text, type }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.06] last:border-0 text-xs">
    <span
      className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
        type === "op"
          ? "bg-rose-500/15 text-rose-300 border border-rose-500/25"
          : "bg-violet-500/15 text-violet-400 border border-violet-500/25"
      }`}
    >
      {index + 1}
    </span>
    <p className="text-gray-300 leading-relaxed pt-0.5">{text}</p>
  </div>
);

// ─── Main Anime Details Page ──────────────────────────────────────────────────

const VISIBLE_TAGS = 7;

const AnimeDetailsPage = () => {
  const { id } = useParams();
  const { username } = useAuth();
  const [anime, setAnime] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [recs, setRecs] = useState([]);
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [listEntry, setListEntry] = useState({ status: "", score: 0 });
  const [showAllTags, setShowAllTags] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const [animeRes, charRes, recRes, themeRes] = await Promise.all([
          api.get(`/api/v1/anime/${id}`),
          api.get(`/api/v1/anime/${id}/characters`).catch(() => ({ data: { data: [] } })),
          api.get(`/api/v1/anime/${id}/recommendations`).catch(() => ({ data: { data: [] } })),
          api.get(`/api/v1/anime/${id}/themes`).catch(() => ({ data: { openings: [], endings: [] } })),
        ]);

        setAnime(animeRes.data);
        setRecs(recRes.data.data || []);
        setThemes(themeRes.data || { openings: [], endings: [] });

        const rawChars = charRes.data.data || [];
        setCharacters(rawChars.sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0)));
      } catch {
        setError("Failed to load anime details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    if (!username || !id) return;

    const loadListStatus = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/by-username/${username}/anime-list`);
        const match = data.find((item) => String(item.animeMalId) === String(id));
        setListEntry({ status: match?.status ?? "", score: match?.score ?? 0 });
      } catch {
        // Non-critical check
      }
    };

    loadListStatus();
  }, [id, username]);

  const handleCopyShare = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#080c14]">
        <span className="w-10 h-10 border-2 border-gray-800 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Loading anime...</p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#080c14] px-4">
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-rose-500/20"
        >
          Try again
        </button>
      </div>
    );

  if (!anime)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <p className="text-gray-500 text-sm">Anime not found.</p>
      </div>
    );

  const poster = getPosterUrl(anime);

  // Group relations
  const allRelations = [];
  (anime.relations ?? []).forEach((rel) => {
    (rel.entries ?? []).forEach((entry) => {
      allRelations.push({
        relationType: rel.relationType,
        ...entry,
      });
    });
  });

  const tags = [
    ...(anime.genres ?? []),
    ...(anime.themes ?? []),
    ...(anime.demographics ?? []),
  ];

  const statusBadge = {
    "Currently Airing": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "Not yet aired": "bg-violet-500/20 text-violet-300 border-violet-500/30",
    "Finished Airing": "bg-gray-600/30 text-gray-300 border-white/10",
  }[anime.status] ?? "bg-gray-600/30 text-gray-300 border-white/10";

  return (
    <div className="min-h-screen text-gray-200 bg-[#080c14] selection:bg-rose-600 selection:text-white">
      {/* ── Atmospheric Ambient Backdrop ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
        <img
          src={poster}
          alt=""
          className="w-full h-full object-cover object-top scale-125 blur-3xl opacity-[0.07]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,12,20,0.6) 0%, rgba(8,12,20,0.95) 40%, #080c14 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ══════════════════════════════════════════════════════════════════
            HERO HEADER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative pt-8 pb-10 border-b border-white/[0.06] overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 md:px-10 max-w-7xl">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
              {/* ── Poster Card ── */}
              <div className="shrink-0 self-center md:self-end w-44 sm:w-52 md:w-60">
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.8)] bg-[#0c121d]">
                  <img
                    src={poster}
                    alt={anime.title}
                    className="w-full h-auto block"
                    onError={(e) => {
                      e.target.src = "/placeholder-anime.jpg";
                    }}
                  />

                  {/* Status badge */}
                  {anime.status && (
                    <span
                      className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider backdrop-blur-md ${statusBadge}`}
                    >
                      {anime.status === "Currently Airing" ? "● Airing" : anime.status}
                    </span>
                  )}

                  {/* Score pill overlay */}
                  {anime.score && (
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 backdrop-blur-md">
                      <FaStar className="text-yellow-400 text-xs" />
                      <span className="text-white text-xs font-black">{anime.score}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Info & Actions ── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Genre Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, showAllTags ? tags.length : VISIBLE_TAGS).map((g) => (
                      <GenreTag
                        key={g.malId ?? g.name}
                        to={`/tags?tagId=${g.malId}&type=${g.type}&name=${encodeURIComponent(g.name)}`}
                      >
                        {g.name}
                      </GenreTag>
                    ))}
                    {tags.length > VISIBLE_TAGS && (
                      <button
                        type="button"
                        onClick={() => setShowAllTags(!showAllTags)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-400 bg-white/[0.04] border border-white/[0.08] hover:text-white transition"
                      >
                        {showAllTags ? "Show less" : `+${tags.length - VISIBLE_TAGS} more`}
                      </button>
                    )}
                  </div>
                )}

                {/* Title */}
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                    {anime.title}
                  </h1>
                  {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                    <p className="text-gray-400 text-sm sm:text-base mt-1 font-medium">{anime.titleEnglish}</p>
                  )}
                  {anime.titleJapanese && (
                    <p className="text-gray-500 text-xs mt-0.5">{anime.titleJapanese}</p>
                  )}
                </div>

                {/* Meta details strip */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400 font-medium">
                  {anime.type && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-gray-200 font-semibold uppercase">
                      {anime.type}
                    </span>
                  )}
                  {anime.episodes && <span>{anime.episodes} episodes</span>}
                  {anime.duration && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span>{anime.duration}</span>
                    </>
                  )}
                  {anime.season && anime.year && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="capitalize">
                        {anime.season} {anime.year}
                      </span>
                    </>
                  )}
                  {anime.rating && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-400">{anime.rating}</span>
                    </>
                  )}
                </div>

                {/* Stat pills row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {anime.score != null && (
                    <Stat label="Score" value={anime.score} color="text-yellow-400" icon={FaStar} />
                  )}
                  {anime.rank != null && (
                    <Stat label="Rank" value={`#${anime.rank}`} color="text-amber-400" icon={FaTrophy} />
                  )}
                  {anime.popularity != null && (
                    <Stat label="Popularity" value={`#${anime.popularity}`} color="text-rose-400" icon={FaTv} />
                  )}
                  {anime.members != null && (
                    <Stat label="Members" value={anime.members.toLocaleString()} icon={FaUsers} />
                  )}
                  {anime.favorites != null && (
                    <Stat label="Favorites" value={anime.favorites.toLocaleString()} color="text-rose-400" icon={FaHeart} />
                  )}
                </div>

                {/* ── Primary Action Bar ── */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  {/* Modern Watchlist Button */}
                  <AnimeListStatusControl
                    animeMalId={anime.malId ?? Number(id)}
                    animeTitle={anime.title}
                    initialStatus={listEntry.status}
                    initialScore={listEntry.score}
                    onStatusChange={(nextStatus, data) =>
                      setListEntry((current) => ({
                        status: nextStatus,
                        score: data?.score ?? current.score,
                      }))
                    }
                  />

                  {/* Watch Trailer Button */}
                  {anime.trailer?.youtubeId && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("trailer-section");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-gray-200 hover:bg-white/[0.08] hover:text-white transition active:scale-[0.98]"
                    >
                      <FaPlayCircle className="text-rose-400 text-sm" />
                      <span>Trailer</span>
                    </button>
                  )}

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={handleCopyShare}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white transition active:scale-[0.98]"
                    title="Copy anime link"
                  >
                    <FaShareAlt className="text-xs" />
                    <span>{copied ? "Copied!" : "Share"}</span>
                  </button>

                  {/* MAL Link */}
                  {anime.url && (
                    <a
                      href={anime.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 transition active:scale-[0.98]"
                      title="View on MyAnimeList"
                    >
                      <span className="font-bold text-rose-400">MAL</span>
                      <FaExternalLinkAlt className="text-[10px]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════════════════ */}
        <main className="container mx-auto px-4 sm:px-6 md:px-10 max-w-7xl py-10 space-y-12">
          {/* ── Synopsis & Details Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2/3: Synopsis & Background */}
            <div className="lg:col-span-2 space-y-8">
              {anime.synopsis && (
                <section>
                  <Heading>Synopsis</Heading>
                  <Glass className="p-6">
                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                      {anime.synopsis}
                    </p>
                  </Glass>
                </section>
              )}

              {anime.background && (
                <section>
                  <Heading>Background</Heading>
                  <Glass className="p-6">
                    <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                      {anime.background}
                    </p>
                  </Glass>
                </section>
              )}
            </div>

            {/* Right 1/3: Quick Specs Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <section>
                <Heading>Information</Heading>
                <Glass className="px-5 py-2">
                  <InfoRow label="Type">{anime.type ?? "N/A"}</InfoRow>
                  <InfoRow label="Episodes">{anime.episodes ?? "N/A"}</InfoRow>
                  <InfoRow label="Duration">{anime.duration ?? "N/A"}</InfoRow>
                  <InfoRow label="Aired">{anime.aired?.string ?? "N/A"}</InfoRow>
                  <InfoRow label="Broadcast">{anime.broadcast?.string ?? "N/A"}</InfoRow>
                  <InfoRow label="Source">{anime.source ?? "N/A"}</InfoRow>
                  <InfoRow label="Rating">{anime.rating ?? "N/A"}</InfoRow>
                  {anime.studios?.length > 0 && (
                    <InfoRow label="Studios">{anime.studios.map((s) => s.name).join(", ")}</InfoRow>
                  )}
                  {anime.producers?.length > 0 && (
                    <InfoRow label="Producers">
                      <span className="line-clamp-3">{anime.producers.map((p) => p.name).join(", ")}</span>
                    </InfoRow>
                  )}
                  {anime.licensors?.length > 0 && (
                    <InfoRow label="Licensors">{anime.licensors.map((l) => l.name).join(", ")}</InfoRow>
                  )}
                </Glass>
              </section>
            </div>
          </div>

          {/* ── Related Works (HORIZONTAL SLIDER) ── */}
          {allRelations.length > 0 && (
            <section>
              <Heading count={allRelations.length}>Related Entries</Heading>
              <HScroll id="relations">
                {allRelations.map((entry, idx) => (
                  <RelationCard
                    key={`${entry.malId}-${entry.relationType}-${idx}`}
                    entry={entry}
                    relationType={entry.relationType}
                  />
                ))}
              </HScroll>
            </section>
          )}

          {/* ── Characters & Voice Actors ── */}
          {characters.length > 0 && (
            <section>
              <Heading count={characters.length}>Characters & Voice Actors</Heading>
              <HScroll id="chars">
                {characters.map((c, i) => (
                  <CharCard key={c.character?.mal_id || c.character?.malId || i} char={c} />
                ))}
              </HScroll>
            </section>
          )}

          {/* ── Trailer Video ── */}
          {anime.trailer?.youtubeId && (
            <section id="trailer-section">
              <div className="flex items-center justify-between mb-3 max-w-3xl">
                <Heading>Official Trailer</Heading>
                <a
                  href={`https://www.youtube.com/watch?v=${anime.trailer.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg"
                >
                  <FaYoutube className="text-red-500 text-sm" />
                  <span>Watch on YouTube</span>
                </a>
              </div>
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/[0.08] max-w-3xl bg-black shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${anime.trailer.youtubeId}?enablejsapi=1`}
                  title={`${anime.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="w-full h-full"
                />
              </div>
            </section>
          )}

          {/* ── Theme Songs ── */}
          {(themes.openings?.length > 0 || themes.endings?.length > 0) && (
            <section>
              <Heading>Theme Songs</Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {themes.openings?.length > 0 && (
                  <Glass className="p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                        Openings ({themes.openings.length})
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {themes.openings.map((t, i) => (
                        <ThemeLine key={i} index={i} text={t} type="op" />
                      ))}
                    </div>
                  </Glass>
                )}
                {themes.endings?.length > 0 && (
                  <Glass className="p-5">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                        Endings ({themes.endings.length})
                      </span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {themes.endings.map((t, i) => (
                        <ThemeLine key={i} index={i} text={t} type="ed" />
                      ))}
                    </div>
                  </Glass>
                )}
              </div>
            </section>
          )}

          {/* ── Recommendations ── */}
          {recs.length > 0 && (
            <section>
              <Heading count={recs.length}>Recommended Anime</Heading>
              <HScroll id="recs">
                {recs.map((rec) => (
                  <RecCard key={rec.entry?.malId} rec={rec} />
                ))}
              </HScroll>
            </section>
          )}

          {/* ── Where to Watch & Streaming ── */}
          {(anime.streamingLinks?.length > 0 || anime.externalLinks?.length > 0) && (
            <section>
              <Heading>Where to Watch & Official Links</Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {anime.streamingLinks?.map((l, i) => (
                  <ExtLink key={`s${i}`} name={l.name} url={l.url} streaming />
                ))}
                {anime.externalLinks?.map((l, i) => (
                  <ExtLink key={`e${i}`} name={l.name} url={l.url} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default AnimeDetailsPage;
