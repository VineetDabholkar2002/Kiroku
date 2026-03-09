import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpotifyProvider } from './context/SpotifyContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages and components for route-based code-splitting
const MainPage = lazy(() => import('./pages/MainPage'));
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AnimeDetailPage = lazy(() => import('./pages/AnimeDetailPage'));
const PopularPage = lazy(() => import('./pages/PopularPage'));
const FavoritesPage = lazy(() => import('./pages/FavouritesPage'));
const TopRatedPage = lazy(() => import('./pages/TopRatedPage'));
const AiringPage = lazy(() => import('./pages/AiringPage'));
const PlaylistMaker = lazy(() => import('./pages/PlaylistMaker'));
const SpotifyCallback = lazy(() => import('./pages/SpotifyCallback'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SpotifyBar = lazy(() => import('./components/SpotifyBar'));

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <SpotifyProvider>
        <Router>
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center h-40">Loading…</div>}>
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/anime/:id" element={<AnimeDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/upcoming" element={<UpcomingPage />} />
                <Route path="/airing" element={<AiringPage />} />
                <Route path="/popular" element={<PopularPage />} />
                <Route path="/favourites" element={<FavoritesPage />} />
                <Route path="/top-rated" element={<TopRatedPage />} />
                <Route path="/playlist" element={<PlaylistMaker />} />
                <Route path="/callback" element={<SpotifyCallback />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>

            {/* Lazy-load the SpotifyBar so it doesn't block initial routing bundle */}
            <Suspense fallback={null}>
              <SpotifyBar />
            </Suspense>
          </ErrorBoundary>
        </Router>
      </SpotifyProvider>
    </div>
  );
}

export default App;
