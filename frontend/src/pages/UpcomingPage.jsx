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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader icon={<span>🗓</span>} label="Coming Soon" title="Upcoming Anime" subtitle="Future series and movies yet to air" />
        <Grid>
          {animeList.filter(a => !a.placeholder).map((anime, i) => {
            const malId = anime.malId ?? anime.MalId;
            const title = anime.title ?? anime.Title ?? "Untitled";
            const type = anime.type ?? anime.Type;
            const popularity = anime.popularity ?? anime.Popularity;
            const airedFrom = anime.aired?.from ?? anime.Aired?.From;
            const members = anime.members ?? anime.Members;

            return (
              <AnimeCard key={`${malId}-${i}`} to={`/anime/${malId}`} image={getImg(anime)} title={title} type={type}
                badge={popularity ? `#${popularity}` : null} index={i}
              >
                <Row label="Airs"    value={formatDate(airedFrom)} color="text-cyan-400" />
                <Row label="Members" value={members?.toLocaleString()} />
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

export default UpcomingPage;
