import { useEffect } from "react";
import Navbar from "../skeletons/Navbar";
import useAnimeData from "../hooks/useAnimeData";
import { PageShell, PageHeader, Grid, AnimeCard, Row, Spinner, EndMsg } from "./PopularPage";

const getImg = (anime) =>
  anime?.Images?.find(i => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl || "/placeholder-anime.jpg";

const formatDate = (dateStr) => {
  if (!dateStr) return "TBA";
  try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "TBA"; }
};

const UpcomingPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("upcoming");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <Navbar />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <PageHeader icon={<span>🗓</span>} label="Coming Soon" title="Upcoming Anime" subtitle="Future series and movies yet to air" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => (
            <AnimeCard key={`${anime.MalId}-${i}`} to={`/anime/${anime.MalId}`} image={getImg(anime)} title={anime.Title} type={anime.Type}
              badge={anime.Popularity ? `#${anime.Popularity}` : null} index={i}
            >
              <Row label="Airs"    value={formatDate(anime.Aired?.From)} color="text-cyan-400" />
              <Row label="Members" value={anime.Members?.toLocaleString()} />
            </AnimeCard>
          ))}
        </Grid>
        {loading && <Spinner />}
        {isEnd && !loading && <EndMsg count={animeList.filter(a => !a.placeholder).length} />}
      </div>
    </PageShell>
  );
};

export default UpcomingPage;