import { useEffect, useRef } from "react";
import { X, GripVertical, Music, Play } from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueueDrawer({ isOpen, onClose }: QueueDrawerProps) {
  const { queue, fetchQueue, currentTrack, reorderQueue, playFromQueue } =
    usePlayerStore();
  const { t } = useTranslation();

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    }
  }, [isOpen, fetchQueue]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;
    reorderQueue(sourceIndex, destinationIndex);
  };

  const virtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, 
    overscan: 5,
  });

  const renderTrackItem = (
    track: any,
    index: number,
    isPlaying: boolean,
    provided: any,
    isDragging: boolean = false,
  ) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      onDoubleClick={() => !isDragging && playFromQueue(index)}
      className={`flex items-center gap-3 p-3 h-full rounded-xl transition-all cursor-pointer group ${
        isDragging
          ? "bg-surface shadow-2xl ring-1 ring-brand-primary scale-[1.02] z-50"
          : "hover:bg-surface-hover/50"
      } ${isPlaying ? "bg-brand-primary/10" : ""}`}
      style={provided.draggableProps.style}
    >
      <div
        {...provided.dragHandleProps}
        className="w-8 flex items-center justify-center shrink-0"
      >
        {isPlaying ? (
          <Play
            size={16}
            className="text-brand-primary animate-pulse fill-brand-primary"
          />
        ) : (
          <GripVertical
            size={18}
            className={`text-muted cursor-grab active:cursor-grabbing transition-opacity ${
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 select-none">
        <p
          className={`text-sm font-semibold truncate transition-colors ${
            isPlaying
              ? "text-brand-primary"
              : "text-content group-hover:text-brand-primary"
          }`}
        >
          {track.title}
        </p>
        <p className="text-xs text-muted truncate mt-0.5">{track.artist}</p>
      </div>

      {track.time && (
        <div className="text-xs font-variant-numeric text-muted opacity-0 group-hover:opacity-100 transition-opacity pr-2">
          {track.time}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-96 max-w-full bg-surface/95 backdrop-blur-3xl border-l border-divider/50 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-2xl flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-divider/30 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-content">
              {t("common.queue")}
            </h2>
            <p className="text-xs text-muted font-medium mt-1">
              {t("common.songCount", { query: queue.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-background/50 text-muted hover:text-content hover:bg-background rounded-full transition-all hover:scale-105"
          >
            <X size={20} />
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
            <Music size={48} className="mb-4 text-muted" />
            <h3 className="text-lg font-semibold text-content mb-1">
              La cola está vacía
            </h3>
            <p className="text-sm text-muted">
              Añade algunas pistas para empezar a escuchar.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable
              droppableId="queue-list"
              mode="virtual"
              renderClone={(provided, snapshot, rubric) => {
                const track = queue[rubric.source.index];
                const isPlaying = currentTrack?.path === track.path;
                return renderTrackItem(
                  track,
                  rubric.source.index,
                  isPlaying,
                  provided,
                  snapshot.isDragging,
                );
              }}
            >
              {(provided) => (
                <div
                  className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar"
                  ref={(el) => {
                    parentRef.current = el;
                    provided.innerRef(el);
                  }}
                  {...provided.droppableProps}
                >
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const track = queue[virtualItem.index];
                      const isPlaying = currentTrack?.path === track.path;

                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                            paddingBottom: "8px",
                          }}
                        >
                          <Draggable
                            draggableId={`${track.path}-${virtualItem.index}`}
                            index={virtualItem.index}
                          >
                            {(provided, snapshot) =>
                              renderTrackItem(
                                track,
                                virtualItem.index,
                                isPlaying,
                                provided,
                                snapshot.isDragging,
                              )
                            }
                          </Draggable>
                        </div>
                      );
                    })}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </>
  );
}
