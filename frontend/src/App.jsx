import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SpotifyProvider } from "./context/SpotifyContext";

const MainPage = lazy(() => import("./pages/MainPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const UpcomingPage = lazy(() => import("./pages/UpcomingPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AnimeDetailPage = lazy(() => import("./pages/AnimeDetailPage"));
const PopularPage = lazy(() => import("./pages/PopularPage"));
const FavoritesPage = lazy(() => import("./pages/FavouritesPage"));
const TopRatedPage = lazy(() => import("./pages/TopRatedPage"));
const AiringPage = lazy(() => import("./pages/AiringPage"));
const PlaylistMaker = lazy(() => import("./pages/PlaylistMaker"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const TagsPage = lazy(() => import("./pages/TagsPage"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const SpotifyBar = lazy(() => import("./components/SpotifyBar"));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Suspense fallback={<div className="flex items-center justify-center h-40">Loading...</div>}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/popular" replace /> : <LoginPage />} />
          <Route path="/anime/:id" element={<ProtectedRoute><AnimeDetailPage /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/upcoming" element={<ProtectedRoute><UpcomingPage /></ProtectedRoute>} />
          <Route path="/airing" element={<ProtectedRoute><AiringPage /></ProtectedRoute>} />
          <Route path="/popular" element={<ProtectedRoute><PopularPage /></ProtectedRoute>} />
          <Route path="/favourites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/top-rated" element={<ProtectedRoute><TopRatedPage /></ProtectedRoute>} />
          <Route path="/playlist" element={<ProtectedRoute><PlaylistMaker /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/tags" element={<ProtectedRoute><TagsPage /></ProtectedRoute>} />
          <Route path="/callback" element={<ProtectedRoute><SpotifyCallback /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <Suspense fallback={null}>
        <SpotifyBar />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AuthProvider>
        <SpotifyProvider>
          <Router>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </Router>
        </SpotifyProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
