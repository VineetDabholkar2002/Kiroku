import { useEffect } from "react";
import Navbar from "../skeletons/Navbar";
import useAnimeData from "../hooks/useAnimeData";
import { PageShell, PageHeader, Grid, AnimeCard, Row, Spinner, EndMsg } from "./PopularPage";

const getImg = (anime) =>
  anime?.Images?.find(i => i.Format === "jpg")?.ImageUrl ||
  anime?.Images?.[0]?.ImageUrl || "/placeholder-anime.jpg";

const FavoritesPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("favourites");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <Navbar />
      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <PageHeader icon={<span>❤️</span>} label="Fan Favourites" title="Most Favourited Anime" subtitle="The anime fans love most worldwide" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => (
            <AnimeCard key={`${anime.MalId}-${i}`} to={`/anime/${anime.MalId}`} image={getImg(anime)} title={anime.Title} type={anime.Type}
              badge={anime.Favorites ? `❤️ ${anime.Favorites.toLocaleString()}` : null} index={i}
            >
              <Row label="Score"      value={anime.Score ? `⭐ ${anime.Score}` : "N/A"} color="text-yellow-400" />
              <Row label="Popularity" value={anime.Popularity ? `#${anime.Popularity}` : "N/A"} color="text-orange-400" />
            </AnimeCard>
          ))}
        </Grid>
        {loading && <Spinner />}
        {isEnd && !loading && <EndMsg count={animeList.filter(a => !a.placeholder).length} />}
      </div>
    </PageShell>
  );
};

export default FavoritesPage;