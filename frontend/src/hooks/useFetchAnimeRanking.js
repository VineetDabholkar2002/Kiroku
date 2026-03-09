import { useState, useEffect } from "react";
import axios from "axios";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const useFetchAnimeRanking = (rankingType = "bypopularity") => {
  const [animeRanking, setAnimeRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await axios.get(`/api/v1/anime/ranking`, {
          params: { ranking_type: rankingType },
        });
        await delay(1000); 
        setAnimeRanking(response.data.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (rankingType) {
      fetchRanking();
  }
    
  }, [rankingType]);

  return { animeRanking, loading, error };
};

export default useFetchAnimeRanking;
