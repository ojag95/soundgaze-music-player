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
  artist?: string;
  album?: string;
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
  isTimelapseRunning: boolean;

  initializeGraph: () => void;
  expandNode: (nodeId: string, startX?: number, startY?: number) => void;
  playTimelapse: (network?: any) => void;
  stopTimelapse: () => void;
}

const buildCoverUrl = (path: string | undefined) => {
  if (!path) return undefined;
  const { basePath, coverCacheBuster } = useLibrarySettingsStore.getState();
  return `cover://localhost/?path=${encodeURIComponent(path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;
};

let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

export const clearGraphAnimationTimeouts = () => {
  activeTimeouts.forEach(clearTimeout);
  activeTimeouts = [];
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: new DataSet<GraphNode>(),
  edges: new DataSet<GraphEdge>(),
  expandedNodes: new Set(),
  isTimelapseRunning: false,

  initializeGraph: () => {
    clearGraphAnimationTimeouts();
    set({ isTimelapseRunning: false });

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

      nodes.add({
        id: rootId,
        label: selectedAlbum,
        group: 'album',
        size: showCovers ? 30 : 18,
        shape: showCovers ? 'circularImage' : 'dot',
        image: showCovers ? buildCoverUrl(coverPath) : undefined,
        coverPath,
        artist: selectedArtist,
        album: selectedAlbum,
      });
      get().expandedNodes.add(rootId);

      const totalTracks = tracks.length;
      tracks.forEach((track, idx) => {
        const trackId = `track-${track.path}`;
        const angle = (2 * Math.PI * idx) / (totalTracks || 1) + (Math.random() * 0.2 - 0.1);
        const radius = 25;
        newNodes.push({
          id: trackId,
          label: track.title,
          group: 'track',
          size: 6,
          trackPath: track.path,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          artist: selectedArtist,
          album: selectedAlbum,
        });
        newEdges.push({ id: `edge-${rootId}-${trackId}`, from: rootId, to: trackId });
      });

      // Brote secuencial radial estilo Obsidian (más lento y cinemático)
      const stepDelay = Math.max(30, Math.min(70, Math.floor(900 / (newNodes.length || 1))));
      newNodes.forEach((node, idx) => {
        const t = setTimeout(() => {
          if (!nodes.get(node.id)) nodes.add(node);
          if (!edges.get(newEdges[idx].id)) edges.add(newEdges[idx]);
        }, idx * stepDelay);
        activeTimeouts.push(t);
      });

    } else if (selectedArtist && !selectedAlbum) {
      const rootId = `artist-${selectedArtist}`;
      nodes.add({ id: rootId, label: selectedArtist, group: 'artist', size: 18, artist: selectedArtist });
      get().expandedNodes.add(rootId);

      const albums = Object.keys(libraryTree[selectedArtist] || {});
      const totalAlbums = albums.length;
      albums.forEach((album, idx) => {
        const albumId = `album-${selectedArtist}-${album}`;
        const tracks = libraryTree[selectedArtist][album] || [];
        const coverPath = tracks.length > 0 ? tracks[0].path : undefined;
        const angle = (2 * Math.PI * idx) / (totalAlbums || 1) + (Math.random() * 0.2 - 0.1);
        const radius = 35;

        newNodes.push({
          id: albumId,
          label: album,
          group: 'album',
          size: showCovers ? 20 : 8,
          shape: showCovers ? 'circularImage' : 'dot',
          image: showCovers ? buildCoverUrl(coverPath) : undefined,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          coverPath,
          artist: selectedArtist,
          album,
        });
        newEdges.push({ id: `edge-${rootId}-${albumId}`, from: rootId, to: albumId });
      });

      // Brote secuencial radial estilo Obsidian (más lento y cinemático)
      const stepDelay = Math.max(35, Math.min(80, Math.floor(1000 / (newNodes.length || 1))));
      newNodes.forEach((node, idx) => {
        const t = setTimeout(() => {
          if (!nodes.get(node.id)) nodes.add(node);
          if (!edges.get(newEdges[idx].id)) edges.add(newEdges[idx]);
        }, idx * stepDelay);
        activeTimeouts.push(t);
      });

    } else {
      nodes.add({ 
        id: 'root', 
        label: i18next.t("common.yourLibrary", "Tu biblioteca"), 
        group: 'root', 
        size: 18 
      });
      get().expandedNodes.add('root');
      
      const artists = Object.keys(libraryTree);
      const totalArtists = artists.length;
      artists.forEach((artist, idx) => {
        const artistId = `artist-${artist}`;
        const angle = (2 * Math.PI * idx) / (totalArtists || 1) + (Math.random() * 0.2 - 0.1);
        const radius = 50;

        newNodes.push({ 
          id: artistId, 
          label: artist, 
          group: 'artist', 
          size: 12, 
          artist,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
        newEdges.push({ id: `edge-root-${artistId}`, from: 'root', to: artistId });
      });

      // Brote secuencial radial estilo Obsidian (más lento y cinemático)
      const stepDelay = Math.max(20, Math.min(60, Math.floor(1200 / (newNodes.length || 1))));
      newNodes.forEach((node, idx) => {
        const t = setTimeout(() => {
          if (!nodes.get(node.id)) nodes.add(node);
          if (!edges.get(newEdges[idx].id)) edges.add(newEdges[idx]);
        }, idx * stepDelay);
        activeTimeouts.push(t);
      });
    }
  },

  expandNode: (nodeId: string, startX?: number, startY?: number) => {
    const { libraryTree } = usePlayerStore.getState();
    const showCovers = usePluginStore.getState().graphViewSettings?.showAlbumCovers ?? true;
    const { nodes, edges, expandedNodes } = get();

    if (expandedNodes.has(nodeId)) return;
    expandedNodes.add(nodeId);

    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    if (nodeId.startsWith('artist-')) {
      const artistName = nodeId.replace('artist-', '');
      const albums = Object.keys(libraryTree[artistName] || {});
      const total = albums.length;

      albums.forEach((album, idx) => {
        const albumId = `album-${artistName}-${album}`;
        const angle = (2 * Math.PI * idx) / (total || 1) + (Math.random() * 0.2 - 0.1);
        const radius = 25;
        const offsetX = startX !== undefined ? startX + Math.cos(angle) * radius : undefined;
        const offsetY = startY !== undefined ? startY + Math.sin(angle) * radius : undefined;

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
          coverPath,
          artist: artistName,
          album,
        });
        newEdges.push({ id: `edge-${nodeId}-${albumId}`, from: nodeId, to: albumId });
      });

    } else if (nodeId.startsWith('album-')) {
      const existingNode = nodes.get(nodeId) as unknown as GraphNode | undefined;
      const parts = nodeId.split('-');
      const artistName = existingNode?.artist || parts[1];
      const albumName = existingNode?.album || parts.slice(2).join('-');

      const tracks = libraryTree[artistName]?.[albumName] || [];
      const total = tracks.length;

      tracks.forEach((track, idx) => {
        const trackId = `track-${track.path}`;
        const angle = (2 * Math.PI * idx) / (total || 1) + (Math.random() * 0.2 - 0.1);
        const radius = 15;
        const offsetX = startX !== undefined ? startX + Math.cos(angle) * radius : undefined;
        const offsetY = startY !== undefined ? startY + Math.sin(angle) * radius : undefined;

        newNodes.push({
          id: trackId,
          label: track.title,
          group: 'track',
          size: 6,
          trackPath: track.path,
          x: offsetX,
          y: offsetY,
          artist: artistName,
          album: albumName,
        });
        newEdges.push({ id: `edge-${nodeId}-${trackId}`, from: nodeId, to: trackId });
      });
    }

    if (newNodes.length > 0) {
      // Brote secuencial radial estilo Obsidian (más pausado y fluido)
      const total = newNodes.length;
      const stepDelay = Math.max(30, Math.min(75, Math.floor(900 / total)));

      newNodes.forEach((node, idx) => {
        const t = setTimeout(() => {
          if (!nodes.get(node.id)) {
            nodes.add(node);
          }
          if (!edges.get(newEdges[idx].id)) {
            edges.add(newEdges[idx]);
          }
        }, idx * stepDelay);
        activeTimeouts.push(t);
      });
    }
  },

  playTimelapse: (network?: any) => {
    clearGraphAnimationTimeouts();
    set({ isTimelapseRunning: true });

    // 1. Reiniciar el grafo
    get().initializeGraph();

    const { libraryTree, selectedArtist, selectedAlbum } = usePlayerStore.getState();

    // Si ya estamos filtrados en un álbum, todos los tracks ya brotan en initializeGraph
    if (selectedArtist && selectedAlbum) {
      const finishTimeout = setTimeout(() => {
        set({ isTimelapseRunning: false });
      }, 1200);
      activeTimeouts.push(finishTimeout);
      return;
    }

    // Si estamos filtrados en un solo artista: expandir cada uno de sus álbumes en cascada
    if (selectedArtist && !selectedAlbum) {
      const albums = Object.keys(libraryTree[selectedArtist] || {});
      const albumsToExpand = albums.slice(0, 15);

      albumsToExpand.forEach((album, idx) => {
        const timeout = setTimeout(() => {
          if (!get().isTimelapseRunning) return;
          const albumNodeId = `album-${selectedArtist}-${album}`;
          const pos = network?.getPositions([albumNodeId])?.[albumNodeId];
          get().expandNode(albumNodeId, pos?.x, pos?.y);
          if (idx === albumsToExpand.length - 1) {
            set({ isTimelapseRunning: false });
          }
        }, 1000 + idx * 550);
        activeTimeouts.push(timeout);
      });
      return;
    }

    // Vista general de toda la biblioteca: expandir secuencialmente los artistas principales
    const artists = Object.keys(libraryTree);
    const artistsToExpand = artists.slice(0, 12);

    artistsToExpand.forEach((artist, idx) => {
      const timeout = setTimeout(() => {
        if (!get().isTimelapseRunning) return;
        const artistNodeId = `artist-${artist}`;
        const pos = network?.getPositions([artistNodeId])?.[artistNodeId];
        get().expandNode(artistNodeId, pos?.x, pos?.y);
        if (idx === artistsToExpand.length - 1) {
          set({ isTimelapseRunning: false });
        }
      }, 1200 + idx * 600);
      activeTimeouts.push(timeout);
    });
  },

  stopTimelapse: () => {
    clearGraphAnimationTimeouts();
    set({ isTimelapseRunning: false });
  },
}));