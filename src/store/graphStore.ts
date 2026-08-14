import { create } from 'zustand';
import { usePlayerStore } from './playerStore';
import { useLibrarySettingsStore } from './librarySettingsStore';
import { DataSet } from 'vis-network/standalone';
import { usePluginStore } from './pluginStore';
import i18next from 'i18next';

export interface GraphNode {
  id: string;
  label: string;
  group: 'root' | 'artist' | 'album' | 'track';
  size?: number;
  trackPath?: string;
  coverPath?: string;
  shape?: string;
  image?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

interface GraphState {
  nodes: DataSet<GraphNode, 'id'>;
  edges: DataSet<GraphEdge, 'id'>;
  expandedNodes: Set<string>;

  initializeGraph: () => void;
  expandNode: (nodeId: string, startX?: number, startY?: number) => void;
}

const buildCoverUrl = (path: string | undefined) => {
  if (!path) return undefined;
  const { basePath, coverCacheBuster } = useLibrarySettingsStore.getState();
  return `cover://localhost/?path=${encodeURIComponent(path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;
};

export const useGraphStore = create<GraphState>((_set, get) => ({
  nodes: new DataSet<GraphNode>(),
  edges: new DataSet<GraphEdge>(),
  expandedNodes: new Set(),

  initializeGraph: () => {
    const { libraryTree, selectedArtist, selectedAlbum } = usePlayerStore.getState();
    const { nodes, edges } = get();
    const showCovers = usePluginStore.getState().graphViewSettings?.showAlbumCovers ?? true;

    nodes.clear();
    edges.clear();
    get().expandedNodes.clear();

    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    if (selectedArtist && selectedAlbum) {
      const rootId = `album-${selectedArtist}-${selectedAlbum}`;
      const tracks = libraryTree[selectedArtist]?.[selectedAlbum] || [];
      const coverPath = tracks.length > 0 ? tracks[0].path : undefined;

      newNodes.push({
        id: rootId,
        label: selectedAlbum,
        group: 'album',
        size: showCovers ? 30 : 18,
        shape: showCovers ? 'circularImage' : 'dot',
        image: showCovers ? buildCoverUrl(coverPath) : undefined,
        coverPath
      });

      tracks.forEach(track => {
        const trackId = `track-${track.path}`;
        newNodes.push({ id: trackId, label: track.title, group: 'track', size: 6, trackPath: track.path });
        newEdges.push({ id: `edge-${rootId}-${trackId}`, from: rootId, to: trackId });
      });
      get().expandedNodes.add(rootId);

    } else if (selectedArtist && !selectedAlbum) {
      const rootId = `artist-${selectedArtist}`;
      newNodes.push({ id: rootId, label: selectedArtist, group: 'artist', size: 18 });

      const albums = Object.keys(libraryTree[selectedArtist] || {});
      albums.forEach(album => {
        const albumId = `album-${selectedArtist}-${album}`;
        const tracks = libraryTree[selectedArtist][album] || [];
        const coverPath = tracks.length > 0 ? tracks[0].path : undefined;

        newNodes.push({
          id: albumId,
          label: album,
          group: 'album',
          size: showCovers ? 20 : 8,
          shape: showCovers ? 'circularImage' : 'dot',
          image: showCovers ? buildCoverUrl(coverPath) : undefined,
          coverPath
        });
        newEdges.push({ id: `edge-${rootId}-${albumId}`, from: rootId, to: albumId });
      });
      get().expandedNodes.add(rootId);

    } else {
      nodes.add({ 
        id: 'root', 
        label: i18next.t("common.yourLibrary", "Tu biblioteca"), 
        group: 'root', 
        size: 18 
      });
      
      const artists = Object.keys(libraryTree);
      artists.forEach(artist => {
        const artistId = `artist-${artist}`;
        newNodes.push({ id: artistId, label: artist, group: 'artist', size: 12 });
        newEdges.push({ id: `edge-root-${artistId}`, from: 'root', to: artistId });
      });
      get().expandedNodes.add('root');
    }

    nodes.add(newNodes);
    edges.add(newEdges);
  },

  expandNode: (nodeId: string, startX?: number, startY?: number) => {
    const { libraryTree } = usePlayerStore.getState();
    const showCovers = usePluginStore.getState().graphViewSettings?.showAlbumCovers ?? true;
    const { nodes, edges, expandedNodes } = get();

    if (expandedNodes.has(nodeId)) return;

    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    if (nodeId.startsWith('artist-')) {
      const artistName = nodeId.replace('artist-', '');
      const albums = Object.keys(libraryTree[artistName] || {});

      albums.forEach(album => {
        const albumId = `album-${artistName}-${album}`;
        const offsetX = startX !== undefined ? startX + (Math.random() * 30 - 15) : undefined;
        const offsetY = startY !== undefined ? startY + (Math.random() * 30 - 15) : undefined;

        const tracks = libraryTree[artistName][album] || [];
        const coverPath = tracks.length > 0 ? tracks[0].path : undefined;

        newNodes.push({
          id: albumId,
          label: album,
          group: 'album',
          size: showCovers ? 20 : 8,
          shape: showCovers ? 'circularImage' : 'dot',
          image: showCovers ? buildCoverUrl(coverPath) : undefined,
          x: offsetX,
          y: offsetY,
          coverPath
        });
        newEdges.push({ id: `edge-${nodeId}-${albumId}`, from: nodeId, to: albumId });
      });

    } else if (nodeId.startsWith('album-')) {
      const parts = nodeId.split('-');
      const artistName = parts[1];
      const albumName = parts.slice(2).join('-');

      const tracks = libraryTree[artistName]?.[albumName] || [];

      tracks.forEach(track => {
        const trackId = `track-${track.path}`;
        const offsetX = startX !== undefined ? startX + (Math.random() * 30 - 15) : undefined;
        const offsetY = startY !== undefined ? startY + (Math.random() * 30 - 15) : undefined;

        newNodes.push({
          id: trackId,
          label: track.title,
          group: 'track',
          size: 6,
          trackPath: track.path,
          x: offsetX,
          y: offsetY
        });
        newEdges.push({ id: `edge-${nodeId}-${trackId}`, from: nodeId, to: trackId });
      });
    }

    if (newNodes.length > 0) {
      nodes.add(newNodes);
      edges.add(newEdges);
      expandedNodes.add(nodeId);
    }
  }
}));