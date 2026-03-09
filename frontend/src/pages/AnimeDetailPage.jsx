import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../skeletons/Navbar";
import { FaChevronLeft, FaChevronRight, FaPlayCircle, FaExternalLinkAlt } from "react-icons/fa";

const AnimeDetailsPage = () => {
  const { id } = useParams();
  const [animeDetails, setAnimeDetails] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [themes, setThemes] = useState({ openings: [], endings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnimeData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [animeResponse, characterResponse, recommendationsResponse, themesResponse] = await Promise.all([
          axios.get(`/api/v1/anime/${id}`),
          axios.get(`/api/v1/anime/${id}/characters`),
          axios.get(`/api/v1/anime/${id}/recommendations`),
          axios.get(`/api/v1/anime/${id}/themes`).catch(() => ({ data: { openings: [], endings: [] } })),
        ]);

        setAnimeDetails(animeResponse.data);

        const charactersWithVAs = await Promise.all(
          (characterResponse.data.data || []).map(async (char) => {
            const voiceActor = char.voiceActors?.[0];
            if (voiceActor && voiceActor.person?.malId && voiceActor.language === "Japanese") {
              try {
                const vaResponse = await axios.get(`/api/v1/people/${voiceActor.person.malId}`);
                const vaDetails = vaResponse.data.data;
                return {
                  ...char,
                  voiceActors: [{
                    ...voiceActor,
                    person: {
                      ...voiceActor.person,
                      images: vaDetails.images,
                    },
                  }],
                };
              } catch (vaError) {
                console.warn(`Failed to fetch VA images for person ID ${voiceActor.person.malId}:`, vaError);
                return char;
              }
            }
            return char;
          })
        );
        console.log(charactersWithVAs)
        setCharacters(charactersWithVAs.sort((a, b) => (b.favorites || 0) - (a.favorites || 0)));
        setRecommendations(recommendationsResponse.data.data || []);
        setThemes(themesResponse.data);

      } catch (err) {
        console.error("Failed to fetch anime data:", err);
        setError("Failed to load anime details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnimeData();
  }, [id]);

  const getAnimeImageUrl = (anime) =>
    anime?.images?.find((img) => img.format === "webp")?.imageUrl ||
    anime?.images?.find((img) => img.format === "jpg")?.imageUrl ||
    anime?.images?.[0]?.imageUrl ||
    "/placeholder-anime.jpg";

  const getCharacterImageUrl = (character) =>
    character?.character?.images?.webp?.image_url ||
    character?.character?.images?.jpg?.image_url ||
    "/placeholder-character.jpg";

  const getVoiceActorImageUrl = (voiceActor) =>
    voiceActor?.person?.images?.jpg?.image_url || "/placeholder-person.jpg";

  const getRecommendationImageUrl = (recommendation) =>
    recommendation?.entry?.images?.jpg?.imageUrl ||
    recommendation?.entry?.images?.webp?.imageUrl ||
    "/placeholder-anime.jpg";

  const scrollSlider = (sliderId, direction) => {
    const slider = document.getElementById(sliderId);
    if (slider) {
      slider.scrollBy({
        left: direction === "left" ? -400 : 400,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-gray-300">
        <p className="text-xl font-semibold animate-pulse">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-gray-300">
        <p className="text-xl font-semibold text-red-400">{error}</p>
      </div>
    );
  }

  if (!animeDetails) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-gray-300">
        <p className="text-xl font-semibold">Anime not found.</p>
      </div>
    );
  }

  const relationsByType = animeDetails.relations.reduce((acc, relation) => {
    if (!acc[relation.relationType]) {
      acc[relation.relationType] = [];
    }
    acc[relation.relationType].push(...relation.entries);
    return acc;
  }, {});

  const posterImage = getAnimeImageUrl(animeDetails);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <Navbar />
      <main className="container mx-auto px-6 pt-24 pb-20 max-w-7xl">
        
        {/* Top Hero Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="w-full md:w-1/4 flex-shrink-0">
            <img
              src={posterImage}
              alt={animeDetails.title}
              className="w-full h-auto rounded-lg shadow-2xl border-4 border-cyan-500"
              loading="lazy"
              onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder-anime.jpg"; }}
            />
          </div>

          <div className="w-full md:w-3/4 space-y-4 md:pl-8">
            <h1 className="text-4xl md:text-5xl font-extrabold gradient-text-mal">
              {animeDetails.title}
            </h1>
            {animeDetails.titleEnglish && <h2 className="text-xl italic text-gray-400">{animeDetails.titleEnglish}</h2>}

            <div className="flex flex-wrap items-center gap-4">
              <ScoreBox label="Score" value={animeDetails.score ?? "N/A"} />
              <InfoBadge label="Rank" value={`#${animeDetails.rank ?? "N/A"}`} />
              <InfoBadge label="Popularity" value={`#${animeDetails.popularity ?? "N/A"}`} />
              <InfoBadge label="Members" value={animeDetails.members?.toLocaleString() ?? "N/A"} />
            </div>
          </div>
        </div>

        {/* Main Content Area (Single Column Layout) */}
        <div className="space-y-12">
          
          {/* Information Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
              <InfoBox label="Type" value={animeDetails.type ?? "N/A"} />
              <InfoBox label="Episodes" value={animeDetails.episodes ?? "N/A"} />
              <InfoBox label="Status" value={animeDetails.status ?? "N/A"} />
              <InfoBox label="Aired" value={animeDetails.aired?.string ?? "N/A"} />
              <InfoBox label="Broadcast" value={animeDetails.broadcast?.string ?? "N/A"} />
              <InfoBox label="Producers" items={animeDetails.producers} />
              <InfoBox label="Studios" items={animeDetails.studios} />
              <InfoBox label="Source" value={animeDetails.source ?? "N/A"} />
              <InfoBox label="Genres" items={animeDetails.genres} />
              <InfoBox label="Themes" items={animeDetails.themes} />
              <InfoBox label="Demographics" items={animeDetails.demographics} />
            </div>
          </section>

          {/* Synopsis */}
          {animeDetails.synopsis && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">Synopsis</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">{animeDetails.synopsis}</p>
            </section>
          )}

          {/* Trailer */}
          {animeDetails.trailer?.youtubeId && (
            <section>
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">Trailer</h2>
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${animeDetails.trailer.youtubeId}`}
                  title={`${animeDetails.title} Trailer`}
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </section>
          )}

          {/* Background */}
          {animeDetails.background && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">Background</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">{animeDetails.background}</p>
            </section>
          )}

          {/* Characters & Voice Actors */}
          {characters.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2 mb-4">Characters & Voice Actors</h2>
              <Slider sliderId="character-slider" items={characters} scrollSlider={scrollSlider}>
                {(item) => (
                  <CharacterCard
                    key={item.character.malId}
                    character={item}
                    getCharacterImageUrl={getCharacterImageUrl}
                    getVoiceActorImageUrl={getVoiceActorImageUrl}
                  />
                )}
              </Slider>
            </section>
          )}

          
          {/* Theme Songs */}
          {(themes.openings?.length > 0 || themes.endings?.length > 0) && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">Theme Songs</h2>
              {themes.openings?.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">Openings</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {themes.openings.map((op, index) => (
                      <li key={`op-${index}`} className="ml-4">{op}</li>
                    ))}
                  </ul>
                </div>
              )}
              {themes.endings?.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">Endings</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {themes.endings.map((ed, index) => (
                      <li key={`ed-${index}`} className="ml-4">{ed}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Related Anime */}
          {Object.keys(relationsByType).length > 0 && (
            <section>
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2 mb-4">Related Anime</h2>
              <div className="space-y-4">
                {Object.entries(relationsByType).map(([relationType, entries]) => (
                  <div key={relationType}>
                    <h3 className="text-xl font-semibold text-cyan-400 capitalize">{relationType.replace(/_/g, ' ')}</h3>
                    <ul className="space-y-1 text-gray-300 mt-1">
                      {entries.map((entry) => (
                        <li key={`${relationType}-${entry.malId}`}>
                          <Link to={`/anime/${entry.malId}`} className="hover:text-blue-400 transition-colors">
                            {entry.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2 mb-4">Recommendations</h2>
              <Slider sliderId="recommendation-slider" items={recommendations} scrollSlider={scrollSlider}>
                {(item) => (
                  <RecommendationCard
                    key={item.entry.malId}
                    recommendation={item}
                    getImageUrl={getRecommendationImageUrl}
                  />
                )}
              </Slider>
            </section>
          )}
          {/* External Links & Streaming */}
          {(animeDetails.externalLinks?.length > 0 || animeDetails.streamingLinks?.length > 0) && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b-2 border-cyan-500 pb-2">External Links</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {animeDetails.streamingLinks?.map((link, index) => (
                  <ExternalLinkCard
                    key={`stream-${index}`}
                    name={link.name}
                    url={link.url}
                    icon={<FaPlayCircle />}
                    color="bg-blue-600 hover:bg-blue-700"
                  />
                ))}
                {animeDetails.externalLinks?.map((link, index) => (
                  <ExternalLinkCard
                    key={`ext-${index}`}
                    name={link.name}
                    url={link.url}
                    icon={<FaExternalLinkAlt />}
                    color="bg-gray-700 hover:bg-gray-600"
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
};

// Reusable components
const InfoBox = ({ label, value, items }) => {
  const content = items && items.length > 0 
    ? items.map(i => i.name || i.rawText).join(", ")
    : value;

  if (!content) return null;

  return (
    <div>
      <p className="font-semibold text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-300">{content}</p>
    </div>
  );
};

const ScoreBox = ({ label, value }) => (
  <div className="bg-blue-600 p-2 rounded-lg text-white text-center shadow-md">
    <p className="text-sm font-light leading-none">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const InfoBadge = ({ label, value }) => (
  <div className="flex flex-col items-center bg-gray-800 p-2 rounded-lg text-white shadow-md">
    <p className="text-sm font-light leading-none text-gray-400">{label}</p>
    <p className="text-lg font-bold">{value}</p>
  </div>
);

const ExternalLinkCard = ({ name, url, icon, color }) => (
  <a href={url} target="_blank" rel="noopener noreferrer" 
    className={`flex items-center justify-between px-4 py-3 rounded-lg text-white font-semibold transition-transform duration-200 ease-in-out transform hover:scale-105 ${color}`}>
    <span className="flex items-center gap-2">
      {icon} {name}
    </span>
    <FaExternalLinkAlt className="opacity-70 group-hover:opacity-100" />
  </a>
);

const Slider = ({ sliderId, items, children, scrollSlider }) => (
  <div className="relative group">
    <button
      onClick={() => scrollSlider(sliderId, "left")}
      className="absolute left-0 top-1/2 -translate-y-1/2 bg-blue-700/80 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
      aria-label="Scroll left"
    >
      <FaChevronLeft size={20} />
    </button>
    <div
      id={sliderId}
      className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth p-2"
    >
      {items.length === 0 ? (
        <p className="text-gray-400 italic">No items found.</p>
      ) : (
        items.map(children)
      )}
    </div>
    <button
      onClick={() => scrollSlider(sliderId, "right")}
      className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-700/80 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
      aria-label="Scroll right"
    >
      <FaChevronRight size={20} />
    </button>
  </div>
);

const CharacterCard = ({ character, getCharacterImageUrl, getVoiceActorImageUrl }) => {
  const voiceActor = character.voice_actors?.[0];
  
  return (
    <div className="shrink-0 w-80 flex flex-col bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transform transition-transform cursor-pointer">
      <div className="flex-1 p-4 flex flex-col items-center border-b border-gray-700">
        <img
          src={getCharacterImageUrl(character)}
          alt={character.character.name}
          className="w-24 h-24 rounded-full border-2 border-blue-500 object-cover mb-2"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/placeholder-character.jpg";
          }}
        />
        <h3 className="font-semibold text-white text-center line-clamp-2">{character.character.name}</h3>
        <p className="text-cyan-400 text-sm capitalize">{character.role}</p>
      </div>
      {voiceActor && (
        <div className="flex-1 p-4 flex flex-col items-center">
          <img
            src={getVoiceActorImageUrl(voiceActor)}
            alt={voiceActor.person.name}
            className="w-24 h-24 rounded-full border-2 border-blue-500 object-cover mb-2"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/placeholder-person.jpg";
            }}
          />
          <h3 className="font-semibold text-white text-center line-clamp-2">{voiceActor.person.name}</h3>
          <p className="text-gray-400 text-sm">{voiceActor.language}</p>
        </div>
      )}
    </div>
  );
};

const RecommendationCard = ({ recommendation, getImageUrl }) => (
  <Link
    to={`/anime/${recommendation.entry.malId}`}
    className="shrink-0 w-64 group bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
  >
    <img
      src={getImageUrl(recommendation)}
      alt={recommendation.entry.title}
      className="w-full h-44 rounded-t-lg object-cover"
      loading="lazy"
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = "/placeholder-anime.jpg";
      }}
    />
    <div className="p-4 text-center">
      <h3 className="font-semibold text-white line-clamp-2 mb-1 group-hover:text-cyan-400 transition-colors">
        {recommendation.entry.title}
      </h3>
      <p className="text-gray-400 text-sm">
        {recommendation.votes} recommendation{recommendation.votes !== 1 ? "s" : ""}
      </p>
    </div>
  </Link>
);

export default AnimeDetailsPage;