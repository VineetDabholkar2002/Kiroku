import { useEffect } from "react";
import Navbar from "../skeletons/Navbar";
import useAnimeData from "../hooks/useAnimeData";
import { PageShell, PageHeader, Grid, AnimeCard, Row, Spinner, EndMsg } from "./PopularPage";

const getImg = (anime) =>
  anime?.Images?.find(i => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl || "/placeholder-anime.jpg";

const AiringPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("airing");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <Navbar />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <PageHeader icon={<span>📡</span>} label="Live" title="Currently Airing" subtitle="Anime episodes releasing right now this season" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => (
            <AnimeCard key={`${anime.MalId}-${i}`} to={`/anime/${anime.MalId}`} image={getImg(anime)} title={anime.Title} type={anime.Type}
              badge={anime.Score ? `⭐ ${anime.Score}` : null} index={i}
            >
              <Row label="Popularity" value={anime.Popularity ? `#${anime.Popularity}` : "N/A"} color="text-orange-400" />
              <Row label="Episodes"   value={anime.Episodes ?? "Ongoing"} color="text-blue-400" />
            </AnimeCard>
          ))}
        </Grid>
        {loading && <Spinner />}
        {isEnd && !loading && <EndMsg count={animeList.filter(a => !a.placeholder).length} />}
      </div>
    </PageShell>
  );
};

export default AiringPage;