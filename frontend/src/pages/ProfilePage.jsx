import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaChartBar, FaUser } from "react-icons/fa";
import AnimeListStatusControl, { ANIME_LIST_STATUSES } from "../components/AnimeListStatusControl";
import { useAuth } from "../context/AuthContext";
import Navbar from "../skeletons/Navbar";
import { PageShell } from "./PopularPage";

const LIST_TABS = ["Anime List", "Analysis"];
const STATUS_FILTERS = ["All", ...ANIME_LIST_STATUSES];
const TAG_TYPES = ["all", "genre", "theme", "demographic"];
const STATUS_STYLES = {
  Watching: { bar: "from-sky-400 to-blue-500", pill: "border-sky-400/20 bg-sky-500/15 text-sky-200" },
  Completed: { bar: "from-emerald-400 to-teal-500", pill: "border-emerald-400/20 bg-emerald-500/15 text-emerald-200" },
  "Plan to Watch": { bar: "from-violet-400 to-fuchsia-500", pill: "border-violet-400/20 bg-violet-500/15 text-violet-200" },
  Dropped: { bar: "from-rose-400 to-red-500", pill: "border-rose-400/20 bg-rose-500/15 text-rose-200" },
};

function normalizeTagType(type) {
  if (type === "explicit_genre") return "genre";
  return type || "genre";
}

function parseDurationToMinutes(duration) {
  if (!duration) return 0;
  const hours = Number(duration.match(/(\d+)\s*hr/i)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)\s*min/i)?.[1] ?? 0);
  return (hours * 60) + minutes;
}

export default function ProfilePage() {
  const { username } = useAuth();
  const [profile, setProfile] = useState(null);
  const [animeList, setAnimeList] = useState([]);
  const [activeTab, setActiveTab] = useState("Anime List");
  const [activeStatusFilter, setActiveStatusFilter] = useState("All");
  const [activeTagType, setActiveTagType] = useState("all");
  const [activeTagId, setActiveTagId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [profileRes, listRes] = await Promise.all([
          axios.get(`/api/v1/user/by-username/${username}`),
          axios.get(`/api/v1/user/by-username/${username}/anime-list`),
        ]);

        if (cancelled) return;

        setProfile(profileRes.data);
        setAnimeList(listRes.data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("Could not load your profile.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const tagSummary = useMemo(() => {
    const map = new Map();
    for (const anime of animeList) {
      for (const tag of anime.tags ?? []) {
        const type = normalizeTagType(tag.type);
        const key = `${type}:${tag.malId}`;
        if (!map.has(key)) map.set(key, { malId: tag.malId, name: tag.name, type, count: 0 });
        map.get(key).count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [animeList]);

  const filteredTags = useMemo(
    () => (activeTagType === "all" ? tagSummary : tagSummary.filter((tag) => tag.type === activeTagType)),
    [activeTagType, tagSummary]
  );

  const filteredList = useMemo(
    () =>
      animeList.filter((item) => {
        const statusMatches = activeStatusFilter === "All" || item.status === activeStatusFilter;
        const tagMatches = !activeTagId || (item.tags ?? []).some((tag) => tag.malId === activeTagId);
        return statusMatches && tagMatches;
      }),
    [activeStatusFilter, activeTagId, animeList]
  );

  const counts = useMemo(() => {
    const map = Object.fromEntries(ANIME_LIST_STATUSES.map((status) => [status, 0]));
    for (const item of animeList) map[item.status] = (map[item.status] ?? 0) + 1;
    return map;
  }, [animeList]);

  const averagePersonalScore = useMemo(() => {
    const scored = animeList.filter((item) => item.score > 0);
    if (!scored.length) return 0;
    return scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
  }, [animeList]);

  const stats = useMemo(() => {
    const completed = animeList.filter((item) => item.status === "Completed");
    const watched = animeList.filter((item) => item.status === "Completed" || item.status === "Watching");
    const totalEpisodesWatched = watched.reduce((sum, item) => sum + (item.episodes ?? 0), 0);
    const totalMinutesWatched = watched.reduce((sum, item) => sum + ((item.episodes ?? 0) * parseDurationToMinutes(item.duration)), 0);

    const genreCounts = new Map();
    const studioCounts = new Map();

    for (const item of completed) {
      for (const tag of item.tags ?? []) {
        if (normalizeTagType(tag.type) !== "genre") continue;
        genreCounts.set(tag.name, (genreCounts.get(tag.name) ?? 0) + 1);
      }

      for (const studio of item.studios ?? []) {
        studioCounts.set(studio, (studioCounts.get(studio) ?? 0) + 1);
      }
    }

    const favouriteGenres = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const mostWatchedStudioEntry = Array.from(studioCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    return {
      completedCount: completed.length,
      totalEpisodesWatched,
      totalHoursWatched: totalMinutesWatched / 60,
      favouriteGenres,
      currentWatchingCount: counts.Watching ?? 0,
      mostWatchedStudio: mostWatchedStudioEntry ? { name: mostWatchedStudioEntry[0], count: mostWatchedStudioEntry[1] } : null,
    };
  }, [animeList, counts]);

  const watchedCount = counts.Completed + counts.Watching;
  const completionRate = animeList.length ? Math.round((counts.Completed / animeList.length) * 100) : 0;
  const topTags = filteredTags.slice(0, 8);

  return (
    <PageShell>
      <Navbar />
      <div className="relative mx-auto max-w-7xl px-4 py-10">
        <ProfileHero
          username={profile?.username ?? username}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={loading}
          totalAnime={animeList.length}
          watchedCount={watchedCount}
          completionRate={completionRate}
          averagePersonalScore={averagePersonalScore}
        />

        {loading && (
          <SectionPanel className="p-8">
            <p className="text-sm text-gray-400">Loading profile...</p>
          </SectionPanel>
        )}

        {error && (
          <SectionPanel className="p-8">
            <p className="text-sm text-red-300">{error}</p>
          </SectionPanel>
        )}

        {!loading && !error && (
          <>
            {activeTab === "Anime List" ? (
              <AnimeListTab
                animeList={animeList}
                counts={counts}
                filteredList={filteredList}
                filteredTags={filteredTags}
                activeStatusFilter={activeStatusFilter}
                setActiveStatusFilter={setActiveStatusFilter}
                activeTagType={activeTagType}
                setActiveTagType={setActiveTagType}
                activeTagId={activeTagId}
                setActiveTagId={setActiveTagId}
                setActiveTab={setActiveTab}
                setAnimeList={setAnimeList}
              />
            ) : (
              <AnalysisTab
                animeList={animeList}
                counts={counts}
                averagePersonalScore={averagePersonalScore}
                watchedCount={watchedCount}
                topTags={topTags}
                filteredTags={filteredTags}
                activeTagType={activeTagType}
                setActiveTagType={setActiveTagType}
                setActiveTagId={setActiveTagId}
                setActiveTab={setActiveTab}
                tagSummaryCount={tagSummary.length}
                stats={stats}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function ProfileHero({ username, activeTab, setActiveTab, loading, totalAnime, watchedCount, completionRate, averagePersonalScore }) {
  const metricValue = (value) => (loading ? "..." : value);

  return (
    <div className="relative mb-10 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 left-[-5rem] h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[-3rem] h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-xl font-black text-white shadow-lg">
            {(username ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-white shadow-lg" style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
                {activeTab === "Anime List" ? <FaUser /> : <FaChartBar />}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400/80">Profile</span>
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">{username}</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">Your anime library, watch progress, and taste profile in one place.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {LIST_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]"
                      : "border border-white/[0.08] bg-black/20 text-gray-300 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[26rem]">
          <HeroMetric label="Tracked" value={metricValue(totalAnime)} />
          <HeroMetric label="Watched" value={metricValue(watchedCount)} />
          <HeroMetric label="Completed" value={metricValue(`${completionRate}%`)} />
          <HeroMetric label="Avg score" value={metricValue(averagePersonalScore ? averagePersonalScore.toFixed(1) : "0.0")} />
        </div>
      </div>
    </div>
  );
}

function AnimeListTab(props) {
  const {
    animeList, counts, filteredList, filteredTags, activeStatusFilter, setActiveStatusFilter,
    activeTagType, setActiveTagType, activeTagId, setActiveTagId, setActiveTab, setAnimeList,
  } = props;

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionPanel className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/80">Library</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Your list at a glance</h2>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs text-gray-300">
              {filteredList.length} visible
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Total" value={animeList.length} compact />
            {ANIME_LIST_STATUSES.map((status) => <StatCard key={status} label={status} value={counts[status] ?? 0} compact />)}
          </div>
        </SectionPanel>

        <SectionPanel className="p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">Status filter</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Focus the list</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveStatusFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeStatusFilter === filter ? "bg-blue-600 text-white" : "border border-white/[0.08] bg-black/20 text-gray-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </SectionPanel>
      </div>

      <TagFilterPanel
        filteredTags={filteredTags}
        activeTagType={activeTagType}
        setActiveTagType={setActiveTagType}
        activeTagId={activeTagId}
        setActiveTagId={setActiveTagId}
      />

      {filteredList.length === 0 ? (
        <EmptyPanel title="No anime match these filters." subtitle="Try another status or tag filter." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((item) => (
            <div
              key={`${item.animeMalId}-${item.status}`}
              className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_18px_60px_rgba(0,0,0,0.28)] transition hover:border-white/[0.14] hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))]"
            >
              <div className="flex gap-4 p-4">
                <Link to={`/anime/${item.animeMalId}`} className="shrink-0">
                  <img src={item.animeImageUrl || "/placeholder-anime.jpg"} alt={item.animeTitle} className="h-32 w-24 rounded-2xl object-cover shadow-lg" onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/anime/${item.animeMalId}`} className="block min-w-0">
                      <h2 className="text-base font-semibold text-white transition-colors hover:text-blue-300">{item.animeTitle}</h2>
                    </Link>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] text-gray-300">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.animeType || "Anime"}{item.animeScore ? ` · Score ${item.animeScore}` : ""}{item.score ? ` · Your score ${item.score}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.tags ?? []).slice(0, 4).map((tag) => (
                      <button
                        key={`${item.animeMalId}-${tag.malId}`}
                        type="button"
                        onClick={() => {
                          setActiveTab("Anime List");
                          setActiveTagType(normalizeTagType(tag.type));
                          setActiveTagId(tag.malId);
                        }}
                        className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <AnimeListStatusControl
                      animeMalId={item.animeMalId}
                      initialStatus={item.status}
                      initialScore={item.score}
                      compact
                      onStatusChange={(nextStatus, data) => {
                        setAnimeList((prev) => prev.map((entry) => (
                          entry.animeMalId === item.animeMalId
                            ? { ...entry, status: nextStatus, score: data?.score ?? entry.score }
                            : entry
                        )));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AnalysisTab(props) {
  const {
    animeList, counts, averagePersonalScore, watchedCount, topTags, filteredTags, activeTagType,
    setActiveTagType, setActiveTagId, setActiveTab, tagSummaryCount, stats,
  } = props;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Watched" value={watchedCount} helpText="Completed + Watching" />
        <StatCard label="Episodes" value={stats.totalEpisodesWatched} helpText="Estimated watched episodes" />
        <StatCard label="Hours watched" value={stats.totalHoursWatched ? stats.totalHoursWatched.toFixed(1) : "0.0"} helpText="Episodes × duration" />
        <StatCard label="Average score" value={averagePersonalScore ? averagePersonalScore.toFixed(1) : "0.0"} helpText="Your scored entries" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionPanel className="p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Personal stats</h2>
              <p className="text-sm text-gray-500">Your watching totals and strongest tendencies.</p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300">
              {stats.completedCount} completed
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500">Favourite genres</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {stats.favouriteGenres.length === 0 && <span className="text-sm text-gray-400">Complete anime to unlock genre stats.</span>}
                {stats.favouriteGenres.map((genre) => (
                  <span key={genre.name} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-gray-200">
                    {genre.name} <span className="text-gray-500">· {genre.count}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500">Studios and activity</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-400">Most watched studio</span>
                  <span className="text-sm font-semibold text-white">
                    {stats.mostWatchedStudio ? `${stats.mostWatchedStudio.name} · ${stats.mostWatchedStudio.count}` : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-400">Watching now</span>
                  <span className="text-sm font-semibold text-white">{stats.currentWatchingCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-400">Distinct tags</span>
                  <span className="text-sm font-semibold text-white">{tagSummaryCount}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel className="p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Status breakdown</h2>
              <p className="text-sm text-gray-500">A cleaner view of how your list is split.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-widest text-gray-500">Tracked</p>
              <p className="mt-1 text-2xl font-black text-white">{animeList.length}</p>
            </div>
          </div>
          <div className="space-y-5">
            {ANIME_LIST_STATUSES.map((status) => {
              const value = counts[status] ?? 0;
              const percent = animeList.length ? Math.round((value / animeList.length) * 100) : 0;
              const style = STATUS_STYLES[status];
              return (
                <div key={status} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${style.pill}`}>{status}</span>
                      <span className="text-sm text-gray-500">{percent}% of list</span>
                    </div>
                    <span className="text-lg font-bold text-white">{value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.04]">
                    <div className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-500`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionPanel>

        <SectionPanel className="p-6">
          <h2 className="mb-5 text-lg font-semibold text-white">Top tags</h2>
          <div className="space-y-3">
            {topTags.length === 0 && <p className="text-gray-500">Add anime to your list to generate tag insights.</p>}
            {topTags.map((tag) => (
              <div key={`${tag.type}:${tag.malId}`} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{tag.name}</p>
                  <p className="text-xs uppercase text-gray-500">{tag.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{tag.count}</span>
                  <Link to={`/tags?tagId=${tag.malId}&type=${tag.type}&name=${encodeURIComponent(tag.name)}`} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white transition hover:bg-white/[0.1]">
                    Explore
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Tag analysis</h2>
            <p className="text-sm text-gray-500">Filter your library by genre, theme, or demographic.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTagType(type)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeTagType === type ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-black/20 text-gray-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {type === "all" ? "All types" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filteredTags.slice(0, 24).map((tag) => (
            <button
              key={`${tag.type}:${tag.malId}`}
              type="button"
              onClick={() => {
                setActiveTab("Anime List");
                setActiveTagType(tag.type);
                setActiveTagId(tag.malId);
              }}
              className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              {tag.name} <span className="text-gray-500">· {tag.count}</span>
            </button>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

function TagFilterPanel({ filteredTags, activeTagType, setActiveTagType, activeTagId, setActiveTagId }) {
  return (
    <SectionPanel className="mb-8 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filter by tags</span>
        {TAG_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTagType(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeTagType === type ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-black/20 text-gray-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {type === "all" ? "All tags" : type}
          </button>
        ))}
        {activeTagId && (
          <button
            type="button"
            onClick={() => setActiveTagId(null)}
            className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Clear tag
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {filteredTags.slice(0, 20).map((tag) => (
          <button
            key={`${tag.type}:${tag.malId}`}
            type="button"
            onClick={() => setActiveTagId(tag.malId)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              activeTagId === tag.malId ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-black/20 text-gray-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {tag.name} <span className="text-gray-500">· {tag.count}</span>
          </button>
        ))}
      </div>
    </SectionPanel>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value, helpText, compact = false }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] ${compact ? "p-4" : "p-5"}`}>
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`mt-2 font-black text-white ${compact ? "text-2xl" : "text-3xl"}`}>{value}</p>
      {helpText && <p className="mt-1 text-xs text-gray-600">{helpText}</p>}
    </div>
  );
}

function SectionPanel({ children, className = "" }) {
  return (
    <div className={`rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))] shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${className}`}>
      {children}
    </div>
  );
}

function EmptyPanel({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 p-8 text-center">
      <p className="text-gray-400">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
    </div>
  );
}
