import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../skeletons/Navbar";
import {
  FaChevronLeft, FaChevronRight,
  FaPlayCircle, FaExternalLinkAlt,
  FaStar, FaUsers, FaHeart, FaTrophy, FaCalendarAlt,
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";

// ─── Image helpers ────────────────────────────────────────────────────────────

const getPosterUrl = (anime) =>
  anime?.images?.find((i) => i.format === "jpg")?.imageUrl  ||
  anime?.images?.find((i) => i.format === "webp")?.imageUrl ||
  anime?.images?.[0]?.imageUrl ||
  "/placeholder-anime.jpg";

const getCharImg = (char) =>
  char?.character?.images?.webp?.image_url ||
  char?.character?.images?.jpg?.image_url  ||
  "/placeholder-character.jpg";

const getVaImg = (va) =>
  va?.person?.images?.jpg?.image_url || "/placeholder-person.jpg";

const getRecImg = (rec) =>
  rec?.entry?.images?.jpg?.imageUrl  ||
  rec?.entry?.images?.webp?.imageUrl ||
  "/placeholder-anime.jpg";

// ─── Glass card wrapper ───────────────────────────────────────────────────────

const Glass = ({ children, className = "", style = {} }) => (
  <div
    className={`rounded-2xl border border-white/[0.07] ${className}`}
    style={{ background: "rgba(255,255,255,0.03)", ...style }}
  >
    {children}
  </div>
);

// ─── Section heading ──────────────────────────────────────────────────────────

const Heading = ({ children, count }) => (
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-base font-bold text-white flex items-center gap-2.5">
      <span className="w-[3px] h-4 rounded-full shrink-0"
        style={{ background: "linear-gradient(to bottom,#60a5fa,#a78bfa)" }} />
      {children}
    </h2>
    {count != null && (
      <span className="text-xs text-gray-600 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.07]">
        {count}
      </span>
    )}
  </div>
);

// ─── Horizontal scroll ────────────────────────────────────────────────────────

const HScroll = ({ id, children }) => {
  const scroll = (dir) =>
    document.getElementById(id)?.scrollBy({ left: dir === "left" ? -420 : 420, behavior: "smooth" });

  return (
    <div className="relative group/s -mx-1 px-1">
      {/* Left arrow */}
      <button onClick={() => scroll("left")} aria-label="Scroll left"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8
          flex items-center justify-center rounded-full
          bg-black/80 border border-white/10 text-white
          opacity-0 group-hover/s:opacity-100 transition-all -translate-x-3
          hover:bg-white/15 hover:scale-110">
        <FaChevronLeft size={11} />
      </button>

      <div id={id} className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}>
        {children}
      </div>

      {/* Right arrow */}
      <button onClick={() => scroll("right")} aria-label="Scroll right"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8
          flex items-center justify-center rounded-full
          bg-black/80 border border-white/10 text-white
          opacity-0 group-hover/s:opacity-100 transition-all translate-x-3
          hover:bg-white/15 hover:scale-110">
        <FaChevronRight size={11} />
      </button>
    </div>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const Stat = ({ label, value, color = "text-white", sub }) => (
  <Glass className="px-4 py-3 text-center min-w-[80px]">
    <div className={`text-xl font-black leading-none ${color}`}>{value}</div>
    {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    <div className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">{label}</div>
  </Glass>
);

// ─── Genre tag ────────────────────────────────────────────────────────────────

const GenreTag = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium
    text-gray-300 bg-white/[0.06] border border-white/[0.08]
    hover:bg-white/[0.1] hover:text-white transition-colors cursor-default">
    {children}
  </span>
);

// ─── Info table row ───────────────────────────────────────────────────────────

const InfoRow = ({ label, children }) => (
  <div className="flex gap-4 py-2.5 border-b border-white/[0.05] last:border-0">
    <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider shrink-0 w-24 pt-0.5">
      {label}
    </span>
    <span className="text-sm text-gray-300 leading-relaxed">{children}</span>
  </div>
);

// ─── Character card ───────────────────────────────────────────────────────────

const CharCard = ({ char }) => {
  const va = char.voiceActors?.[0];
  return (
    <div className="shrink-0 w-40 rounded-2xl overflow-hidden border border-white/[0.07]
      hover:border-white/[0.15] hover:scale-[1.03] transition-all duration-300 cursor-pointer"
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)" }}>

      {/* Character half */}
      <div className="relative overflow-hidden">
        <img src={getCharImg(char)} alt={char.character?.name} loading="lazy"
          className="w-full h-44 object-cover object-top"
          onError={(e) => { e.target.src = "/placeholder-character.jpg"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white text-[11px] font-bold line-clamp-2 leading-tight">
            {char.character?.name}
          </p>
          <p className="text-blue-400 text-[10px] capitalize mt-0.5">{char.role}</p>
        </div>
      </div>

      {/* VA half */}
      {va && (
        <div className="flex items-center gap-2 p-2.5 border-t border-white/[0.06]">
          <img src={getVaImg(va)} alt={va.person?.name} loading="lazy"
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
            onError={(e) => { e.target.src = "/placeholder-person.jpg"; }}
          />
          <div className="min-w-0">
            <p className="text-gray-300 text-[10px] font-medium truncate">{va.person?.name}</p>
            <p className="text-gray-600 text-[9px]">{va.language}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Recommendation card ──────────────────────────────────────────────────────

const RecCard = ({ rec }) => (
  <Link to={`/anime/${rec.entry.malId}`}
    className="shrink-0 w-32 group rounded-xl overflow-hidden border border-white/[0.07]
      hover:border-white/[0.18] hover:scale-[1.04]
      hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300"
    style={{ background: "rgba(255,255,255,0.03)" }}
  >
    <div className="relative overflow-hidden">
      <img src={getRecImg(rec)} alt={rec.entry.title} loading="lazy"
        className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => { e.target.src = "/placeholder-anime.jpg"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {rec.votes > 0 && (
        <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold
          px-1.5 py-0.5 rounded border border-white/10">
          {rec.votes}✓
        </div>
      )}
    </div>
    <div className="p-2.5">
      <p className="text-white text-[11px] font-semibold line-clamp-2 leading-snug
        group-hover:text-blue-300 transition-colors">
        {rec.entry.title}
      </p>
    </div>
  </Link>
);

// ─── External link ────────────────────────────────────────────────────────────

const ExtLink = ({ name, url, streaming }) => (
  <a href={url} target="_blank" rel="noopener noreferrer"
    className={`group flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
      transition-all active:scale-95
      ${streaming
        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
        : "bg-white/[0.03] border-white/[0.07] text-gray-400 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15]"
      }`}
  >
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
      ${streaming ? "bg-emerald-500/20" : "bg-white/[0.05]"}`}>
      {streaming
        ? <FaPlayCircle className="text-emerald-400 text-sm" />
        : <FaExternalLinkAlt className="text-gray-500 text-xs" />
      }
    </div>
    <span className="flex-1 truncate">{name}</span>
    <FaExternalLinkAlt className="text-[9px] opacity-0 group-hover:opacity-40 transition-opacity" />
  </a>
);

// ─── Theme song item ──────────────────────────────────────────────────────────

const ThemeLine = ({ index, text, type }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
    <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black
      ${type === "op"
        ? "bg-blue-500/20 text-blue-400"
        : "bg-violet-500/20 text-violet-400"
      }`}>
      {index + 1}
    </span>
    <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
  </div>
);

// ─── Full screen states ───────────────────────────────────────────────────────

const Screen = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
    <Navbar />
    {children}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AnimeDetailsPage = () => {
  const { id } = useParams();
  const [anime, setAnime]               = useState(null);
  const [characters, setCharacters]     = useState([]);
  const [recs, setRecs]                 = useState([]);
  const [themes, setThemes]             = useState({ openings: [], endings: [] });
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const run = async () => {
      try {
        setLoading(true); setError(null);

        const [animeRes, charRes, recRes, themeRes] = await Promise.all([
          axios.get(`/api/v1/anime/${id}`),
          axios.get(`/api/v1/anime/${id}/characters`),
          axios.get(`/api/v1/anime/${id}/recommendations`),
          axios.get(`/api/v1/anime/${id}/themes`).catch(() => ({ data: { openings: [], endings: [] } })),
        ]);

        setAnime(animeRes.data);
        setRecs(recRes.data.data || []);
        setThemes(themeRes.data);

        const enriched = await Promise.all(
          (charRes.data.data || []).map(async (char) => {
            const va = char.voiceActors?.[0];
            if (va?.person?.malId && va.language === "Japanese") {
              try {
                const r = await axios.get(`/api/v1/people/${va.person.malId}`);
                return { ...char, voiceActors: [{ ...va, person: { ...va.person, images: r.data.data?.images } }] };
              } catch { return char; }
            }
            return char;
          })
        );
        setCharacters(enriched.sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0)));
      } catch (err) {
        console.error(err);
        setError("Failed to load anime details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080c14" }}>
      <span className="w-10 h-10 border-2 border-gray-800 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">Loading…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#080c14" }}>
      <p className="text-red-400 font-medium">{error}</p>
      <button onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all">
        Try again
      </button>
    </div>
  );

  if (!anime) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <p className="text-gray-600">Anime not found.</p>
    </div>
  );

  const poster = getPosterUrl(anime);

  const relationsByType = (anime.relations ?? []).reduce((acc, rel) => {
    if (!acc[rel.relationType]) acc[rel.relationType] = [];
    acc[rel.relationType].push(...rel.entries);
    return acc;
  }, {});

  const tags = [
    ...(anime.genres      ?? []),
    ...(anime.themes      ?? []),
    ...(anime.demographics ?? []),
  ];

  const statusColor = {
    "Currently Airing": "bg-emerald-500 text-white",
    "Not yet aired":    "bg-violet-500 text-white",
    "Finished Airing":  "bg-gray-700 text-gray-300",
  }[anime.status] ?? "bg-gray-700 text-gray-300";

  return (
    <div className="min-h-screen text-gray-200" style={{ background: "#080c14" }}>

      {/* ── Fixed atmospheric background from poster ──────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <img src={poster} alt=""
          className="w-full h-full object-cover object-top"
          style={{ filter: "blur(100px)", opacity: 0.08, transform: "scale(1.15)" }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(8,12,20,0.55) 0%,rgba(8,12,20,0.92) 30%,#080c14 60%)" }} />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* ══════════════════════════════════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>

          {/* Wide banner blur */}
          <div className="absolute inset-0">
            <img src={poster} alt=""
              className="w-full h-full object-cover object-top"
              style={{ filter: "blur(30px)", opacity: 0.18, transform: "scale(1.08)" }}
            />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom,rgba(8,12,20,0.3) 0%,rgba(8,12,20,0.7) 60%,#080c14 100%)" }} />
            {/* Subtle left-to-right gradient to bleed into the poster area */}
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to right,rgba(8,12,20,0) 30%,rgba(8,12,20,0.7) 100%)" }} />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 md:px-10 max-w-7xl pt-10 pb-0">
            <div className="flex flex-col sm:flex-row gap-8 items-end">

              {/* ── Poster ── */}
              <div className="shrink-0 self-center sm:self-end w-40 sm:w-48 md:w-56">
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.12]"
                  style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
                  <img src={poster} alt={anime.title}
                    className="w-full h-auto block"
                    onError={(e) => { e.target.src = "/placeholder-anime.jpg"; }}
                  />
                  {/* Status */}
                  {anime.status && (
                    <span className={`absolute top-2.5 left-2.5 text-[9px] font-black px-2 py-0.5 rounded-lg ${statusColor}`}>
                      {anime.status === "Currently Airing" ? "● AIRING" : anime.status.toUpperCase()}
                    </span>
                  )}
                  {/* Score overlay at bottom */}
                  {anime.score && (
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1
                      py-2 bg-gradient-to-t from-black/90 to-transparent">
                      <FaStar className="text-yellow-400 text-xs" />
                      <span className="text-white text-sm font-black">{anime.score}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Title block ── */}
              <div className="flex-1 pb-10 min-w-0 space-y-4">

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 6).map((g) => (
                      <GenreTag key={g.malId ?? g.name}>{g.name}</GenreTag>
                    ))}
                  </div>
                )}

                {/* Title */}
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                    {anime.title}
                  </h1>
                  {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                    <p className="text-gray-500 text-base mt-1.5">{anime.titleEnglish}</p>
                  )}
                  {anime.titleJapanese && (
                    <p className="text-gray-600 text-sm mt-0.5">{anime.titleJapanese}</p>
                  )}
                </div>

                {/* Quick meta strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                  {anime.type     && <span>{anime.type}</span>}
                  {anime.episodes && <><span className="text-gray-700">·</span><span>{anime.episodes} eps</span></>}
                  {anime.duration && <><span className="text-gray-700">·</span><span>{anime.duration}</span></>}
                  {anime.season   && anime.year && (
                    <><span className="text-gray-700">·</span>
                    <span className="capitalize">{anime.season} {anime.year}</span></>
                  )}
                  {anime.rating   && <><span className="text-gray-700">·</span><span>{anime.rating}</span></>}
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2.5">
                  {anime.score      != null && <Stat label="Score"      value={anime.score}                       color="text-yellow-400" />}
                  {anime.rank       != null && <Stat label="Rank"       value={`#${anime.rank}`}                  color="text-orange-400" />}
                  {anime.popularity != null && <Stat label="Popularity" value={`#${anime.popularity}`}            color="text-blue-400" />}
                  {anime.members    != null && <Stat label="Members"    value={anime.members.toLocaleString()}    />}
                  {anime.favorites  != null && <Stat label="Favourites" value={anime.favorites.toLocaleString()}  color="text-pink-400" />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════════════════ */}
        <main className="container mx-auto px-4 sm:px-6 md:px-10 max-w-7xl py-12 space-y-16">

          {/* ── Synopsis + Info grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Synopsis (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {anime.synopsis && (
                <section>
                  <Heading>Synopsis</Heading>
                  <Glass className="p-6">
                    <p className="text-gray-400 leading-[1.85] text-[15px]">{anime.synopsis}</p>
                  </Glass>
                </section>
              )}

              {anime.background && (
                <section>
                  <Heading>Background</Heading>
                  <Glass className="p-6">
                    <p className="text-gray-400 leading-[1.85] text-[15px]">{anime.background}</p>
                  </Glass>
                </section>
              )}
            </div>

            {/* Info sidebar (1/3) */}
            <div className="lg:col-span-1">
              <Heading>Details</Heading>
              <Glass className="px-5 py-2 divide-y-0">
                <InfoRow label="Type">{anime.type ?? "—"}</InfoRow>
                <InfoRow label="Episodes">{anime.episodes ?? "—"}</InfoRow>
                <InfoRow label="Duration">{anime.duration ?? "—"}</InfoRow>
                <InfoRow label="Aired">{anime.aired?.string ?? "—"}</InfoRow>
                <InfoRow label="Broadcast">{anime.broadcast?.string ?? "—"}</InfoRow>
                <InfoRow label="Source">{anime.source ?? "—"}</InfoRow>
                <InfoRow label="Rating">{anime.rating ?? "—"}</InfoRow>
                {anime.studios?.length > 0 && (
                  <InfoRow label="Studios">{anime.studios.map(s => s.name).join(", ")}</InfoRow>
                )}
                {anime.producers?.length > 0 && (
                  <InfoRow label="Producers">
                    <span className="line-clamp-3">{anime.producers.map(p => p.name).join(", ")}</span>
                  </InfoRow>
                )}
              </Glass>
            </div>
          </div>

          {/* ── Trailer ─────────────────────────────────────────────────── */}
          {anime.trailer?.youtubeId && (
            <section>
              <Heading>Trailer</Heading>
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/[0.07] max-w-3xl"
                style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${anime.trailer.youtubeId}`}
                  title={`${anime.title} Trailer`}
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </section>
          )}

          {/* ── Characters & Voice Actors ────────────────────────────────── */}
          {characters.length > 0 && (
            <section>
              <Heading count={characters.length}>Characters & Voice Actors</Heading>
              <HScroll id="chars">
                {characters.map((c) => <CharCard key={c.character?.malId} char={c} />)}
              </HScroll>
            </section>
          )}

          {/* ── Theme Songs ──────────────────────────────────────────────── */}
          {(themes.openings?.length > 0 || themes.endings?.length > 0) && (
            <section>
              <Heading>Theme Songs</Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {themes.openings?.length > 0 && (
                  <Glass className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">
                        Openings · {themes.openings.length}
                      </span>
                    </div>
                    {themes.openings.map((t, i) => <ThemeLine key={i} index={i} text={t} type="op" />)}
                  </Glass>
                )}
                {themes.endings?.length > 0 && (
                  <Glass className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-[11px] font-black text-violet-400 uppercase tracking-widest">
                        Endings · {themes.endings.length}
                      </span>
                    </div>
                    {themes.endings.map((t, i) => <ThemeLine key={i} index={i} text={t} type="ed" />)}
                  </Glass>
                )}
              </div>
            </section>
          )}

          {/* ── Related Anime ────────────────────────────────────────────── */}
          {Object.keys(relationsByType).length > 0 && (
            <section>
              <Heading>Related Anime</Heading>
              <Glass className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  {Object.entries(relationsByType).map(([type, entries]) => (
                    <div key={type}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ color: "rgba(96,165,250,0.7)" }}>
                        {type.replace(/_/g, " ")}
                      </p>
                      <ul className="space-y-2">
                        {entries.map((entry) => (
                          <li key={entry.malId} className="flex items-start gap-2">
                            <span className="text-gray-700 mt-1.5 shrink-0">›</span>
                            <Link to={`/anime/${entry.malId}`}
                              className="text-sm text-gray-400 hover:text-blue-300 transition-colors leading-relaxed">
                              {entry.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Glass>
            </section>
          )}

          {/* ── Recommendations ──────────────────────────────────────────── */}
          {recs.length > 0 && (
            <section>
              <Heading count={recs.length}>Recommendations</Heading>
              <HScroll id="recs">
                {recs.map((rec) => <RecCard key={rec.entry?.malId} rec={rec} />)}
              </HScroll>
            </section>
          )}

          {/* ── External Links ────────────────────────────────────────────── */}
          {(anime.streamingLinks?.length > 0 || anime.externalLinks?.length > 0) && (
            <section>
              <Heading>Where to Watch & Links</Heading>
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