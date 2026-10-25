import { useEffect } from "react";
import useAnimeData from "../hooks/useAnimeData";
import { PageShell, PageHeader, Grid, AnimeCard, Row, Spinner, EndMsg } from "../components/common/AnimePageCommon";

const getImg = (anime) => {
  const images = anime?.images || anime?.Images;
  return (
    images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.imageUrl ||
    images?.find((i) => (i.format || i.Format)?.toLowerCase() === "jpg")?.ImageUrl ||
    images?.[0]?.imageUrl ||
    images?.[0]?.ImageUrl ||
    "/placeholder-anime.jpg"
  );
};

const FavoritesPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("favourites");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader icon={<span>❤️</span>} label="Fan Favourites" title="Most Favourited Anime" subtitle="The anime fans love most worldwide" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => {
            const malId = anime.malId ?? anime.MalId;
            const title = anime.title ?? anime.Title ?? "Untitled";
            const type = anime.type ?? anime.Type;
            const favorites = anime.favorites ?? anime.Favorites;
            const score = anime.score ?? anime.Score;
            const popularity = anime.popularity ?? anime.Popularity;

            return (
              <AnimeCard key={`${malId}-${i}`} to={`/anime/${malId}`} image={getImg(anime)} title={title} type={type}
                badge={favorites ? `❤️ ${favorites.toLocaleString()}` : null} index={i}
              >
                <Row label="Score"      value={score ? `⭐ ${score}` : "N/A"} color="text-yellow-400" />
                <Row label="Popularity" value={popularity ? `#${popularity}` : "N/A"} color="text-orange-400" />
              </AnimeCard>
            );
          })}
        </Grid>
        {loading && <Spinner />}
        {isEnd && !loading && <EndMsg count={animeList.filter(a => !a.placeholder).length} />}
      </div>
    </PageShell>
  );
};

export default FavoritesPage;
