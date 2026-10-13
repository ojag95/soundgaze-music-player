import React from "react";
import { createMemoryRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Library from "../pages/Library";

const GraphView = React.lazy(() => import("../plugins/GraphView/GraphView"));
const TimelineView = React.lazy(() => import("../plugins/TimelineView/TimelineView"));
const GenreDetail = React.lazy(() => import("../pages/GenreDetail"));
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
