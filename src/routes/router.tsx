import { createMemoryRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Library from "../pages/Library";
import GenreDetail from "../pages/GenreDetail";
import Playlists from "../pages/Playlist";
import GraphView from "../plugins/GraphView/GraphView";
import TimelineView from "../plugins/TimelineView/TimelineView";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Library />,
      },
      {
        path: "graphical-view",
        element: <GraphView />,
      },
      {
        path: "timeline-view",
        element: <TimelineView />,
      },
      {
        path: "genre/:genreId",
        element: <GenreDetail />,
      },

      {
        path: "playlists",
        element: <Playlists />,
      },
    ],
  },
]);
