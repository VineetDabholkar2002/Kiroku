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

const AiringPage = () => {
  const { animeList, loading, isEnd, handleScroll } = useAnimeData("airing");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader icon={<span>📡</span>} label="Live" title="Currently Airing" subtitle="Anime episodes releasing right now this season" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => {
            const malId = anime.malId ?? anime.MalId;
            const title = anime.title ?? anime.Title ?? "Untitled";
            const type = anime.type ?? anime.Type;
            const popularity = anime.popularity ?? anime.Popularity;
            const score = anime.score ?? anime.Score;
            const episodes = anime.episodes ?? anime.Episodes;

            return (
              <AnimeCard key={`${malId}-${i}`} to={`/anime/${malId}`} image={getImg(anime)} title={title} type={type}
                badge={score ? `⭐ ${score}` : null} index={i}
              >
                <Row label="Popularity" value={popularity ? `#${popularity}` : "N/A"} color="text-orange-400" />
                <Row label="Episodes"   value={episodes ?? "Ongoing"} color="text-rose-400" />
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

export default AiringPage;
