import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FaChartBar, FaStar, FaUser, FaUsers } from "react-icons/fa";
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

export default function ProfilePage() {
  const { username } = useAuth();
  const [profile, setProfile] = useState(null);
  const [animeList, setAnimeList] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [activeTab, setActiveTab] = useState("Anime List");
  const [activeStatusFilter, setActiveStatusFilter] = useState("All");
  const [activeTagType, setActiveTagType] = useState("all");
  const [activeTagId, setActiveTagId] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      try {
        setLoading(true);
        setRecommendationsLoading(true);
        setError(null);
        const [profileRes, listRes, recRes] = await Promise.all([
          axios.get(`/api/v1/user/by-username/${username}`),
          axios.get(`/api/v1/user/by-username/${username}/anime-list`),
          axios.get(`/api/v1/user/by-username/${username}/recommendations`),
        ]);
        setProfile(profileRes.data);
        setAnimeList(listRes.data);
        setRecommendations(recRes.data);
      } catch (err) {
        console.error(err);
        setError("Could not load your profile.");
      } finally {
        setLoading(false);
        setRecommendationsLoading(false);
      }
    };

    load();
  }, [username]);

  useEffect(() => {
    if (!recommendations?.similarUsers?.length) return setExpandedUser(null);
    setExpandedUser((current) => current ?? recommendations.similarUsers[0].username);
  }, [recommendations]);

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

  const similarUsers = recommendations?.similarUsers ?? [];
  const recommendedAnime = recommendations?.recommendedAnime ?? [];
  const strongestMatch = similarUsers[0];
  const watchedCount = counts.Completed + counts.Watching;
  const topTags = filteredTags.slice(0, 8);

  return (
    <PageShell>
      <Navbar />
      <div className="relative mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-white shadow-lg" style={{ background: "linear-gradient(135deg,#3b82f6,#7c3aed)" }}>
              {activeTab === "Anime List" ? <FaUser /> : <FaChartBar />}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400/80">Profile</span>
          </div>
          <h1 className="text-4xl font-bold text-white">{profile?.username ?? username}</h1>
          <p className="mt-1.5 text-sm text-gray-600">Track your list, your taste, and what fits you next.</p>
        </div>

        {loading && <p className="text-gray-500">Loading profile...</p>}
        {error && <p className="text-red-300">{error}</p>}

        {!loading && !error && (
          <>
            <div className="mb-8 flex flex-wrap gap-2">
              {LIST_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab ? "bg-blue-600 text-white" : "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

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
                recommendationsLoading={recommendationsLoading}
                recommendedAnime={recommendedAnime}
                similarUsers={similarUsers}
                strongestMatch={strongestMatch}
                expandedUser={expandedUser}
                setExpandedUser={setExpandedUser}
                tagSummaryCount={tagSummary.length}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function AnimeListTab(props) {
  const {
    animeList, counts, filteredList, filteredTags, activeStatusFilter, setActiveStatusFilter,
    activeTagType, setActiveTagType, activeTagId, setActiveTagId, setActiveTab, setAnimeList,
  } = props;

  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total" value={animeList.length} />
        {ANIME_LIST_STATUSES.map((status) => <StatCard key={status} label={status} value={counts[status] ?? 0} />)}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveStatusFilter(filter)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeStatusFilter === filter ? "bg-blue-600 text-white" : "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
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
            <div key={`${item.animeMalId}-${item.status}`} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <div className="flex gap-4 p-4">
                <Link to={`/anime/${item.animeMalId}`} className="shrink-0">
                  <img src={item.animeImageUrl || "/placeholder-anime.jpg"} alt={item.animeTitle} className="h-28 w-20 rounded-xl object-cover" onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/anime/${item.animeMalId}`} className="block">
                    <h2 className="text-base font-semibold text-white transition-colors hover:text-blue-300">{item.animeTitle}</h2>
                  </Link>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.animeType || "Anime"}{item.animeScore ? ` • Score ${item.animeScore}` : ""}{item.score ? ` • Your score ${item.score}` : ""}
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
                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
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
                        setAnimeList((prev) => prev.map((entry) => entry.animeMalId === item.animeMalId ? { ...entry, status: nextStatus, score: data?.score ?? entry.score } : entry));
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
    setActiveTagType, setActiveTagId, setActiveTab, recommendationsLoading, recommendedAnime,
    similarUsers, strongestMatch, expandedUser, setExpandedUser, tagSummaryCount,
  } = props;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Watched" value={watchedCount} helpText="Completed + Watching" />
        <StatCard label="Completed" value={counts.Completed} helpText={`${animeList.length ? Math.round((counts.Completed / animeList.length) * 100) : 0}% of list`} />
        <StatCard label="Average score" value={averagePersonalScore ? averagePersonalScore.toFixed(1) : "0.0"} helpText="Your scored entries" />
        <StatCard label="Distinct tags" value={tagSummaryCount} helpText="Across your list" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
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
                <div key={status} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
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
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
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
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecommendationPanel recommendationsLoading={recommendationsLoading} recommendedAnime={recommendedAnime} />
        <SimilarUsersPanel similarUsers={similarUsers} strongestMatch={strongestMatch} expandedUser={expandedUser} setExpandedUser={setExpandedUser} />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
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
                  activeTagType === type ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white"
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
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              {tag.name} <span className="text-gray-500">· {tag.count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TagFilterPanel({ filteredTags, activeTagType, setActiveTagType, activeTagId, setActiveTagId }) {
  return (
    <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Filter by tags</span>
        {TAG_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTagType(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeTagType === type ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {type === "all" ? "All tags" : type}
          </button>
        ))}
        {activeTagId && (
          <button
            type="button"
            onClick={() => setActiveTagId(null)}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
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
              activeTagId === tag.malId ? "bg-violet-600 text-white" : "border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {tag.name} <span className="text-gray-500">· {tag.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendationPanel({ recommendationsLoading, recommendedAnime }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-blue-300">
            <FaStar className="text-xs" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">For you</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Recommended anime</h2>
          <p className="text-sm text-gray-500">Picked from users whose lists overlap most with yours.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">Matches</p>
          <p className="mt-1 text-2xl font-black text-white">{recommendedAnime.length}</p>
        </div>
      </div>

      {recommendationsLoading ? (
        <p className="text-sm text-gray-500">Loading recommendations...</p>
      ) : recommendedAnime.length === 0 ? (
        <EmptyPanel title="Not enough overlap yet." subtitle="Rate more anime in your list and the recommendation model will sharpen up." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendedAnime.slice(0, 8).map((item) => (
            <Link key={item.animeMalId} to={`/anime/${item.animeMalId}`} className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition hover:bg-white/[0.06]">
              <div className="flex gap-4">
                <img src={item.animeImageUrl || "/placeholder-anime.jpg"} alt={item.animeTitle} className="h-28 w-20 rounded-xl object-cover" onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white transition group-hover:text-blue-300">{item.animeTitle}</h3>
                    <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[11px] font-semibold text-blue-200">{Math.round(item.recommendationScore * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{item.animeType || "Anime"}{item.animeScore ? ` • MAL ${item.animeScore}` : ""}{item.rank ? ` • Rank #${item.rank}` : ""}</p>
                  <p className="mt-3 text-xs text-gray-400">Because users like <span className="text-gray-200">{item.reasonUsernames.join(", ")}</span> rated it highly.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.tags ?? []).slice(0, 3).map((tag) => (
                      <span key={`${item.animeMalId}-${tag.malId}`} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300">{tag.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SimilarUsersPanel({ similarUsers, strongestMatch, expandedUser, setExpandedUser }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-violet-300">
          <FaUsers className="text-xs" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">Taste overlap</span>
        </div>
        <h2 className="text-lg font-semibold text-white">Users most similar to you</h2>
        <p className="text-sm text-gray-500">
          {strongestMatch ? `Best match right now is ${strongestMatch.username} at ${Math.round(strongestMatch.similarityScore * 100)}%.` : "This fills in once there is enough shared list data."}
        </p>
      </div>

      {similarUsers.length === 0 ? (
        <EmptyPanel title="No strong user matches yet." subtitle="Once more users have overlapping anime with you, this panel will populate." />
      ) : (
        <div className="space-y-3">
          {similarUsers.map((user) => {
            const isOpen = expandedUser === user.username;
            return (
              <div key={user.username} className="rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <button type="button" onClick={() => setExpandedUser(isOpen ? null : user.username)} className="flex w-full items-start justify-between gap-4 p-4 text-left">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-bold text-white">{user.username.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-semibold text-white">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.sharedAnimeCount} shared anime • {user.sharedCompletedCount} shared watched</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.topSharedTitles.map((title) => (
                        <span key={`${user.username}-${title}`} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300">{title}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white">{Math.round(user.similarityScore * 100)}%</p>
                    <p className="text-[11px] uppercase tracking-widest text-gray-500">Similarity</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="grid gap-3 border-t border-white/[0.08] p-4 sm:grid-cols-2">
                    {user.libraryPreview.map((anime) => (
                      <Link key={`${user.username}-${anime.animeMalId}`} to={`/anime/${anime.animeMalId}`} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:bg-white/[0.05]">
                        <img src={anime.animeImageUrl || "/placeholder-anime.jpg"} alt={anime.animeTitle} className="h-20 w-14 rounded-lg object-cover" onError={(e) => { e.currentTarget.src = "/placeholder-anime.jpg"; }} />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-white">{anime.animeTitle}</p>
                          <p className="mt-1 text-xs text-gray-500">{anime.status}{anime.score ? ` • ${anime.score}/10` : ""}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, helpText }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      {helpText && <p className="mt-1 text-xs text-gray-600">{helpText}</p>}
    </div>
  );
}

function EmptyPanel({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
      <p className="text-gray-400">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
    </div>
  );
}
