import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const useAnimeData = (mode = "popular", columnCount = 5) => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(false);

  const fetchAnimeData = async (pageNum) => {
    if (isEnd || loading) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/anime/${mode}`, {
        params: { page: pageNum },
      });

      console.log("Response data:", response.data.data);
      const newItems = response.data.data;

      if (newItems.length === 0) {
        setIsEnd(true);
      } else {
       setAnimeList((prev) => {
        const existing = new Set(prev.map(a => `${a.MalId}-${a.Id}`));
        const deduped = newItems.filter(a => !existing.has(`${a.MalId}-${a.Id}`));
        return [...prev, ...deduped];
      });

      }
    } catch (error) {
      console.error("Failed to fetch anime data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset when mode changes
    setAnimeList([]);
    setPage(1);
    setIsEnd(false);
  }, [mode]);

  useEffect(() => {
    fetchAnimeData(page);
  }, [page, mode]);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.scrollHeight - 100
    ) {
      if (!loading && !isEnd) {
        setPage((prev) => prev + 1);
      }
    }
  }, [loading, isEnd]);

  const getPaddedList = () => {
    const remainder = animeList.length % columnCount;
    const placeholdersNeeded = remainder ? columnCount - remainder : 0;
    return [...animeList, ...Array.from({ length: placeholdersNeeded }, () => ({ placeholder: true }))];
  };

  return { animeList: getPaddedList(), loading, isEnd, handleScroll };
};

export default useAnimeData;
