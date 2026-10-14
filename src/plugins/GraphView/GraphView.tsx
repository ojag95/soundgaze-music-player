import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Network } from "vis-network/standalone";
import { GraphNode, useGraphStore } from "../../store/graphStore";
import { usePlayerStore, TrackData } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { Network as NetworkIcon, Play, ListPlus, Maximize2, Check, X, Sparkles, Square } from "lucide-react";
import { useTranslation } from "react-i18next";

const getThemeColors = () => {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  return {
    brand:
      computed.getPropertyValue("--color-brand-primary-raw").trim() ||
      "#01A8A8",
    text: computed.getPropertyValue("--text-base").trim() || "#ffffff",
    muted: computed.getPropertyValue("--text-muted").trim() || "#64748B",
    surface: computed.getPropertyValue("--bg-surface").trim() || "#E3E7EF",
    surfaceHover:
      computed.getPropertyValue("--bg-surface-hover").trim() || "#D5DCE6",
    border: computed.getPropertyValue("--border-subtle").trim() || "#CBD5E1",
  };
};

interface ContextMenuState {
  x: number;
  y: number;
  node: GraphNode;
}

const GraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const hoverTooltipRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

  const {
    nodes,
    edges,
    initializeGraph,
    expandNode,
    isTimelapseRunning,
    playTimelapse,
    stopTimelapse,
  } = useGraphStore();
  const playSpecific = usePlayerStore((s) => s.playSpecific);
  const playTracks = usePlayerStore((s) => s.playTracks);
  const enqueueTracks = usePlayerStore((s) => s.enqueueTracks);
  const libraryTree = usePlayerStore((s) => s.libraryTree);
  const selectedArtist = usePlayerStore((s) => s.selectedArtist);
  const selectedAlbum = usePlayerStore((s) => s.selectedAlbum);
  const selectArtist = usePlayerStore((s) => s.selectArtist);
  const selectAlbum = usePlayerStore((s) => s.selectAlbum);

  const { basePath, coverCacheBuster } = useLibrarySettingsStore();

  const [hoveredAlbum, setHoveredAlbum] = useState<{
    id: string;
    path: string;
    name: string;
  } | null>(null);
  const hoveredAlbumIdRef = useRef<string | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleClearFilter = () => {
    stopTimelapse();
    selectArtist(null);
    selectAlbum(null);
    initializeGraph();
    if (networkRef.current) {
      networkRef.current.fit({
        animation: { duration: 1500, easingFunction: "easeInOutQuad" },
      });
    }
  };

  const getGraphOptions = () => {
    const colors = getThemeColors();

    return {
      nodes: {
        shape: "dot",
        font: {
          size: 11,
          color: colors.text,
          face: "Inter, sans-serif",
          vadjust: 6,
          strokeWidth: 3,
          strokeColor: colors.surface,
        },
        borderWidth: 1.5,
        borderWidthSelected: 3,
      },
      groups: {
        root: {
          color: {
            background: colors.brand,
            border: colors.brand,
            highlight: { background: colors.brand, border: colors.text },
          },
        },
        artist: {
          color: {
            background: colors.text,
            border: colors.text,
            highlight: { background: colors.text, border: colors.brand },
          },
        },
        album: {
          borderWidth: 2,
          color: {
            background: colors.muted,
            border: colors.muted,
            highlight: { background: colors.muted, border: colors.brand },
          },
        },
        track: {
          color: {
            background: colors.surfaceHover,
            border: colors.muted,
            highlight: {
              background: colors.surfaceHover,
              border: colors.brand,
            },
          },
        },
      },
      edges: {
        width: 1.5,
        color: {
          color: colors.muted,
          highlight: colors.brand,
          hover: colors.text,
        },
        selectionWidth: 2,
        smooth: { enabled: true, type: "continuous", roundness: 0.5 },
        arrows: { to: { enabled: false } },
      },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -60,
          centralGravity: 0.005,
          springLength: 120,
          springConstant: 0.035,
          damping: 0.65,
          avoidOverlap: 0.35,
        },
        maxVelocity: 20,
        minVelocity: 0.3,
        stabilization: { enabled: true, iterations: 50 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        selectConnectedEdges: false,
        dragNodes: true,
        zoomView: true,
        dragView: true,
      },
    };
  };

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    initializeGraph();

    const containerEl = containerRef.current;
    const handleNativeContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    containerEl?.addEventListener("contextmenu", handleNativeContextMenu);

    if (containerEl) {
      const data = { nodes, edges };
      networkRef.current = new Network(
        containerEl,
        data,
        getGraphOptions(),
      );

      containerEl.style.cursor = "grab";

      networkRef.current.on("click", (params) => {
        setContextMenu(null);
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0] as string;
          const clickedNode = nodes.get(nodeId) as unknown as GraphNode;
          const position = networkRef.current?.getPositions([nodeId])[nodeId];

          if (clickedNode) {
            if (clickedNode.group === "track" && clickedNode.trackPath) {
              const albumTracks = extractAlbumTracks(clickedNode.trackPath);
              playSpecific(clickedNode.trackPath, albumTracks);
            } else {
              expandNode(nodeId, position?.x, position?.y);
            }

            const pathNodes: string[] = [nodeId];
            const pathEdges: string[] = [];
            let currentId = nodeId;

            while (true) {
              const incomingEdges = edges.get({
                filter: (edge: any) => edge.to === currentId,
              });
              if (incomingEdges.length > 0) {
                const parentEdge = incomingEdges[0];
                pathEdges.push(parentEdge.id as string);
                pathNodes.push(parentEdge.from as string);
                currentId = parentEdge.from as string;
              } else {
                break;
              }
            }

            setTimeout(() => {
              networkRef.current?.setSelection({
                nodes: pathNodes,
                edges: pathEdges,
              });
            }, 50);
          }
        }
      });

      networkRef.current.on("oncontext", (params) => {
        params.event.preventDefault();
        params.event.stopPropagation();

        const nodeId = networkRef.current?.getNodeAt(params.pointer.DOM) as string | undefined;
        if (!nodeId) {
          setContextMenu(null);
          return;
        }

        const node = nodes.get(nodeId) as unknown as GraphNode | null;
        if (!node || node.group === "root") {
          setContextMenu(null);
          return;
        }

        networkRef.current?.selectNodes([nodeId]);

        hoveredAlbumIdRef.current = null;
        setHoveredAlbum(null);

        const menuWidth = 240;
        const menuHeight = 180;
        const x = Math.min(params.event.clientX, window.innerWidth - menuWidth - 16);
        const y = Math.min(params.event.clientY, window.innerHeight - menuHeight - 16);

        setContextMenu({
          x: Math.max(16, x),
          y: Math.max(16, y),
          node,
        });
      });

      networkRef.current.on("hoverNode", (params) => {
        if (containerRef.current) containerRef.current.style.cursor = "default";

        const nodeId = params.node;
        const node = nodes.get(nodeId) as unknown as GraphNode;

        if (node && node.group === "album" && node.coverPath) {
          hoveredAlbumIdRef.current = nodeId;
          setHoveredAlbum({
            id: nodeId,
            path: node.coverPath,
            name: node.label,
          });
        }
      });

      networkRef.current.on("blurNode", () => {
        if (containerRef.current) containerRef.current.style.cursor = "grab";
        hoveredAlbumIdRef.current = null;
        setHoveredAlbum(null);
      });

      networkRef.current.on("dragStart", () => {
        if (containerRef.current)
          containerRef.current.style.cursor = "grabbing";
        setContextMenu(null);
        hoveredAlbumIdRef.current = null;
        setHoveredAlbum(null);
      });

      networkRef.current.on("zoom", () => {
        setContextMenu(null);
      });

      networkRef.current.on("dragEnd", () => {
        if (containerRef.current) containerRef.current.style.cursor = "grab";
      });

      networkRef.current.on("afterDrawing", () => {
        if (
          hoveredAlbumIdRef.current &&
          hoverTooltipRef.current &&
          networkRef.current
        ) {
          const id = hoveredAlbumIdRef.current;
          const pos = networkRef.current.getPositions([id])[id];

          if (pos) {
            const domPos = networkRef.current.canvasToDOM(pos);
            hoverTooltipRef.current.style.left = `${domPos.x}px`;
            hoverTooltipRef.current.style.top = `${domPos.y}px`;
          }
        }
      });
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" ||
          mutation.attributeName === "style"
        ) {
          if (networkRef.current) {
            setTimeout(() => {
              networkRef.current?.setOptions(getGraphOptions());
            }, 50);
          }
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      observer.disconnect();
      containerEl?.removeEventListener("contextmenu", handleNativeContextMenu);
      stopTimelapse();
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  const extractAlbumTracks = (targetPath: string): TrackData[] => {
    for (const artist in libraryTree) {
      for (const album in libraryTree[artist]) {
        const tracks = libraryTree[artist][album];
        if (tracks.some((t) => t.path === targetPath)) {
          return tracks;
        }
      }
    }
    return [];
  };

  const getArtistTracks = (artistName: string): TrackData[] => {
    const albums = libraryTree[artistName];
    if (albums) {
      return Object.values(albums).flat();
    }
    const entry = Object.entries(libraryTree).find(
      ([k]) => k.toLowerCase() === artistName.toLowerCase()
    );
    if (entry) {
      return Object.values(entry[1]).flat();
    }
    return [];
  };

  const getAlbumTracks = (node: GraphNode): TrackData[] => {
    if (node.artist && node.album && libraryTree[node.artist]?.[node.album]) {
      return libraryTree[node.artist][node.album];
    }
    if (node.coverPath) {
      const tracks = extractAlbumTracks(node.coverPath);
      if (tracks.length > 0) return tracks;
    }
    const albumName = node.album || node.label;
    for (const artist in libraryTree) {
      if (libraryTree[artist][albumName]) {
        return libraryTree[artist][albumName];
      }
    }
    return [];
  };

  const getTrackData = (node: GraphNode): TrackData[] => {
    if (node.trackPath) {
      const albumTracks = extractAlbumTracks(node.trackPath);
      const track = albumTracks.find((t) => t.path === node.trackPath);
      if (track) return [track];
    }
    return [];
  };

  const handlePlayContextMenu = (node: GraphNode) => {
    setContextMenu(null);
    if (node.group === "artist") {
      const tracks = getArtistTracks(node.artist || node.label);
      if (tracks.length > 0) playTracks(tracks);
    } else if (node.group === "album") {
      const tracks = getAlbumTracks(node);
      if (tracks.length > 0) playTracks(tracks);
    } else if (node.group === "track" && node.trackPath) {
      const albumTracks = extractAlbumTracks(node.trackPath);
      playSpecific(node.trackPath, albumTracks);
    }
  };

  const handleEnqueueContextMenu = (node: GraphNode) => {
    setContextMenu(null);
    if (node.group === "artist") {
      const artist = node.artist || node.label;
      const tracks = getArtistTracks(artist);
      if (tracks.length > 0) {
        enqueueTracks(tracks);
        showToast(
          t("plugins.graphView.artistEnqueued", "{{count}} canciones de {{artist}} añadidas a la cola", {
            count: tracks.length,
            artist,
          })
        );
      }
    } else if (node.group === "album") {
      const album = node.album || node.label;
      const tracks = getAlbumTracks(node);
      if (tracks.length > 0) {
        enqueueTracks(tracks);
        showToast(
          t("plugins.graphView.albumEnqueued", "{{count}} canciones de \"{{album}}\" añadidas a la cola", {
            count: tracks.length,
            album,
          })
        );
      }
    } else if (node.group === "track") {
      const tracks = getTrackData(node);
      if (tracks.length > 0) {
        enqueueTracks(tracks);
        showToast(
          t("plugins.graphView.trackEnqueued", "\"{{title}}\" añadida a la cola", {
            title: node.label,
          })
        );
      }
    }
  };

  const handleExpandContextMenu = (node: GraphNode) => {
    setContextMenu(null);
    const position = networkRef.current?.getPositions([node.id])[node.id];
    expandNode(node.id, position?.x, position?.y);
  };

  return (
    <div className="w-full h-full bg-background overflow-hidden relative flex flex-col animate-in fade-in duration-500">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-8 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface/80 backdrop-blur-md flex items-center justify-center border border-divider shadow-lg">
            <NetworkIcon size={24} className="text-brand-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-content tracking-tight drop-shadow-md">
                {selectedAlbum
                  ? selectedAlbum
                  : selectedArtist
                    ? selectedArtist
                    : t("plugins.graphView.title")}
              </h1>
              {(selectedArtist || selectedAlbum) && (
                <button
                  onClick={handleClearFilter}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-surface/90 backdrop-blur-md border border-divider text-muted hover:text-content hover:border-brand-primary/60 rounded-full text-xs font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all group cursor-pointer"
                  title={t("plugins.graphView.clearFilterTooltip", "Quitar filtro y ver toda la biblioteca en el gráfico")}
                >
                  <X size={13} className="text-muted group-hover:text-brand-primary transition-colors" />
                  <span>{t("common.viewAllLibrary", "Ver toda la biblioteca")}</span>
                </button>
              )}
            </div>
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mt-1 drop-shadow-md">
              {selectedAlbum
                ? t("plugins.graphView.exploringAlbum", "Explorando Álbum")
                : selectedArtist
                  ? t("plugins.graphView.exploringArtist")
                  : t("common.yourLibrary")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              if (isTimelapseRunning) {
                stopTimelapse();
              } else {
                playTimelapse(networkRef.current);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all shadow-sm active:scale-95 cursor-pointer ${
              isTimelapseRunning
                ? "bg-brand-primary text-white border-brand-primary shadow-brand-primary/20 animate-pulse"
                : "bg-surface/70 hover:bg-surface border-divider text-muted hover:text-content hover:border-brand-primary/50"
            }`}
            title={
              isTimelapseRunning
                ? t("plugins.graphView.stopTimelapse", "Detener animación")
                : t("plugins.graphView.timelapseTooltip", "Animar la expansión secuencial de la red")
            }
          >
            {isTimelapseRunning ? (
              <>
                <Square size={12} fill="currentColor" />
                <span>{t("plugins.graphView.stopTimelapse", "Detener")}</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-brand-primary" />
                <span>{t("plugins.graphView.timelapse", "Time-lapse")}</span>
              </>
            )}
          </button>

          <div className="bg-surface/50 backdrop-blur-md px-4 py-2 rounded-full border border-divider/50 text-muted/80 text-xs font-medium shadow-sm">
            {t("plugins.graphView.instructions")}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full absolute inset-0 focus:outline-none"
        style={{ outline: "none" }}
      />

      {hoveredAlbum && (
        <div
          ref={hoverTooltipRef}
          className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full pb-3"
          style={{ left: -9999, top: -9999 }}
        >
          <div className="bg-surface border border-divider shadow-2xl rounded-xl p-2 flex flex-col items-center animate-in zoom-in-95 duration-100">
            <img
              src={`cover://localhost/?path=${encodeURIComponent(hoveredAlbum.path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`}
              alt={hoveredAlbum.name}
              className="w-32 h-32 object-cover rounded shadow-md border border-divider/30"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="text-xs font-bold text-content mt-2 truncate max-w-[128px]">
              {hoveredAlbum.name}
            </span>
          </div>
        </div>
      )}

      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={contextMenuRef}
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
            className="fixed z-[250] min-w-[210px] max-w-[260px] bg-surface/95 backdrop-blur-md border border-divider shadow-2xl rounded-xl p-1.5 flex flex-col gap-0.5 text-content animate-in fade-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="px-2.5 py-1.5 border-b border-divider/50 flex flex-col mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                {contextMenu.node.group === "artist"
                  ? t("common.artist", "Artista")
                  : contextMenu.node.group === "album"
                    ? t("common.album", "Álbum")
                    : t("common.track", "Canción")}
              </span>
              <span className="text-xs md:text-sm font-semibold text-content truncate mt-0.5" title={contextMenu.node.label}>
                {contextMenu.node.label}
              </span>
              {contextMenu.node.group === "album" && contextMenu.node.artist && (
                <span className="text-[11px] text-muted truncate">
                  {contextMenu.node.artist}
                </span>
              )}
            </div>

            <button
              onClick={() => handlePlayContextMenu(contextMenu.node)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs md:text-sm font-medium rounded-lg hover:bg-brand-primary hover:text-white transition-colors group cursor-pointer text-left w-full"
            >
              <Play size={14} fill="currentColor" className="shrink-0 text-brand-primary group-hover:text-white transition-colors" />
              <span className="truncate">
                {contextMenu.node.group === "artist"
                  ? t("plugins.graphView.playArtist", "Reproducir artista")
                  : contextMenu.node.group === "album"
                    ? t("plugins.graphView.playAlbum", "Reproducir álbum")
                    : t("plugins.graphView.playTrack", "Reproducir canción")}
              </span>
            </button>

            <button
              onClick={() => handleEnqueueContextMenu(contextMenu.node)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs md:text-sm font-medium rounded-lg hover:bg-surface-hover text-content transition-colors group cursor-pointer text-left w-full"
            >
              <ListPlus size={15} className="shrink-0 text-muted group-hover:text-brand-primary transition-colors" />
              <span className="truncate">
                {contextMenu.node.group === "artist"
                  ? t("plugins.graphView.enqueueArtist", "Añadir artista a la cola")
                  : contextMenu.node.group === "album"
                    ? t("plugins.graphView.enqueueAlbum", "Añadir álbum a la cola")
                    : t("plugins.graphView.enqueueTrack", "Añadir a la cola")}
              </span>
            </button>

            {contextMenu.node.group !== "track" &&
              !useGraphStore.getState().expandedNodes.has(contextMenu.node.id) && (
                <button
                  onClick={() => handleExpandContextMenu(contextMenu.node)}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs md:text-sm font-medium rounded-lg hover:bg-surface-hover text-muted hover:text-content transition-colors border-t border-divider/40 mt-0.5 pt-1.5 cursor-pointer text-left w-full"
                >
                  <Maximize2 size={14} className="shrink-0" />
                  <span className="truncate">{t("plugins.graphView.expandNode", "Expandir en el gráfico")}</span>
                </button>
              )}
          </div>,
          document.body
        )}

      {toastMessage &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] pointer-events-none flex items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-2.5 px-5 py-2.5 bg-surface/95 backdrop-blur-md border border-divider shadow-2xl rounded-full text-xs md:text-sm font-medium text-content animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="p-1 rounded-full bg-brand-primary/20 text-brand-primary shrink-0">
                <Check size={14} />
              </div>
              <span className="truncate max-w-xs md:max-w-md">{toastMessage}</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default GraphView;
