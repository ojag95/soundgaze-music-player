import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network/standalone";
import { GraphNode, useGraphStore } from "../../store/graphStore";
import { usePlayerStore } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { Network as NetworkIcon } from "lucide-react";
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

const GraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const hoverTooltipRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

  const { nodes, edges, initializeGraph, expandNode } = useGraphStore();
  const playSpecific = usePlayerStore((s) => s.playSpecific);
  const libraryTree = usePlayerStore((s) => s.libraryTree);
  const selectedArtist = usePlayerStore((s) => s.selectedArtist);
  const selectedAlbum = usePlayerStore((s) => s.selectedAlbum);

  const { basePath, coverCacheBuster } = useLibrarySettingsStore();

  const [hoveredAlbum, setHoveredAlbum] = useState<{
    id: string;
    path: string;
    name: string;
  } | null>(null);
  const hoveredAlbumIdRef = useRef<string | null>(null);

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
          springConstant: 0.05,
          damping: 0.5,
          avoidOverlap: 0.3,
        },
        maxVelocity: 30,
        minVelocity: 0.5,
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
    initializeGraph();

    if (containerRef.current) {
      const data = { nodes, edges };
      networkRef.current = new Network(
        containerRef.current,
        data,
        getGraphOptions(),
      );

      containerRef.current.style.cursor = "grab";

      networkRef.current.on("click", (params) => {
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
        hoveredAlbumIdRef.current = null;
        setHoveredAlbum(null);
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
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  const extractAlbumTracks = (targetPath: string) => {
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

  return (
    <div className="w-full h-full bg-background overflow-hidden relative flex flex-col animate-in fade-in duration-500">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-8 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface/80 backdrop-blur-md flex items-center justify-center border border-divider shadow-lg">
            <NetworkIcon size={24} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-content tracking-tight drop-shadow-md">
              {selectedAlbum
                ? selectedAlbum
                : selectedArtist
                  ? selectedArtist
                  : t("plugins.graphView.title")}
            </h1>
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mt-1 drop-shadow-md">
              {selectedAlbum
                ? t("plugins.graphView.exploringAlbum", "Explorando Álbum")
                : selectedArtist
                  ? t("plugins.graphView.exploringArtist")
                  : t("common.yourLibrary")}
            </p>
          </div>
        </div>

        <div className="bg-surface/50 backdrop-blur-md px-4 py-2 rounded-full border border-divider/50 text-muted/80 text-xs font-medium shadow-sm pointer-events-auto">
          {t("plugins.graphView.instructions")}
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
    </div>
  );
};

export default GraphView;
