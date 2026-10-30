import React from "react";
import { createMemoryRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Library from "../pages/Library";

const GraphView = React.lazy(() => import("../plugins/GraphView/GraphView"));
const TimelineView = React.lazy(() => import("../plugins/TimelineView/TimelineView"));
const GenreExplorer = React.lazy(() => import("../plugins/GenreExplorer/GenreExplorer"));
const Playlists = React.lazy(() => import("../pages/Playlist"));

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
        path: "genres",
        element: <GenreExplorer />,
      },
      {
        path: "genres/:genreId",
        element: <GenreExplorer />,
      },
      {
        path: "genre/:genreId",
        element: <GenreExplorer />,
      },

      {
        path: "playlists",
        element: <Playlists />,
      },
    ],
  },
]);
