import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";

const useAnimeData = (mode = "popular", columnCount = 5) => {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(false);
  const fetchingRef = useRef(false);

  // Reset when mode changes
  useEffect(() => {
    setAnimeList([]);
    setPage(1);
    setIsEnd(false);
    setError(null);
  }, [mode]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAnimeData = async () => {
      if (isEnd || fetchingRef.current) return;

      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/api/v1/anime/${mode}`, {
          params: { page },
        });

        if (isCancelled) return;

        const newItems = response.data?.data || [];

        if (newItems.length === 0) {
          setIsEnd(true);
        } else {
          setAnimeList((prev) => {
            const getKey = (a) => `${a.malId ?? a.MalId ?? a.id ?? a.Id}`;
            const existing = new Set(prev.map(getKey));
            const deduped = newItems.filter((a) => !existing.has(getKey(a)));
            return [...prev, ...deduped];
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.response?.data?.message || err.message || "Failed to load anime data.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          fetchingRef.current = false;
        }
      }
    };

    fetchAnimeData();

    return () => {
      isCancelled = true;
      fetchingRef.current = false;
    };
  }, [page, mode, isEnd]);

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.scrollHeight - 150
    ) {
      if (!loading && !isEnd && !fetchingRef.current) {
        setPage((prev) => prev + 1);
      }
    }
  }, [loading, isEnd]);

  const getPaddedList = () => {
    const remainder = animeList.length % columnCount;
    const placeholdersNeeded = remainder ? columnCount - remainder : 0;
    return [...animeList, ...Array.from({ length: placeholdersNeeded }, () => ({ placeholder: true }))];
  };

  return { animeList: getPaddedList(), loading, isEnd, error, handleScroll };
};

export default useAnimeData;
