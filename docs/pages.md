# Frontend Pages

## Current route map

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `MainPage` | Landing page with hero section and ranking sliders. |
| `/anime/:id` | `AnimeDetailPage` | Full anime detail view with characters, recommendations, and themes. |
| `/search` | `SearchPage` | Search experience with infinite scroll. |
| `/upcoming` | `UpcomingPage` | Upcoming anime ranking page. |
| `/airing` | `AiringPage` | Currently airing anime ranking page. |
| `/popular` | `PopularPage` | Popular anime ranking page. |
| `/favourites` | `FavouritesPage` | Favourites ranking page. |
| `/top-rated` | `TopRatedPage` | Top-rated anime ranking page. |
| `/playlist` | `PlaylistMaker` | Spotify-backed anime soundtrack playlist generator. |
| `/chat` | `ChatPage` | Streaming AI chat page backed by `Kiroku.Chat`. |
| `/profile` | `ProfilePage` | Logged-in user profile with editable anime list, analytics, similar-user matching, and anime recommendations. |
| `/callback` | `SpotifyCallback` | Spotify OAuth redirect handler. |
| `*` | `NotFoundPage` | Fallback route. |

## Shared frontend structure

- `frontend/src/App.jsx` owns the route table and lazy-loaded page imports.
- `frontend/src/skeletons/Navbar.jsx` owns the top-level navigation links shown across the app.
- `frontend/src/pages/PopularPage.jsx` exports `PageShell` and other shared layout primitives reused by several pages.

## Chat page notes

- `ChatPage.jsx` uses a modern single-panel chat layout instead of a split content-and-notes layout.
- Chat requests are posted to the FastAPI service through the Vite proxy path `/chat-api`.
- Server-Sent Events are read manually from `response.body.getReader()` and appended into the current assistant message.
- The page has lightweight formatting helpers so rankings and bold text render cleanly.

## Profile page notes

- `ProfilePage.jsx` has two tabs: `Anime List` and `Analysis`.
- `Anime List` supports status filtering, tag filtering, and inline list updates through `AnimeListStatusControl`.
- `Analysis` combines status metrics, top tags, similar-user recommendations, and anime suggestions from the user recommendation API.
- Similar-user cards include a small preview of the matched user's list instead of routing to a separate user page.
