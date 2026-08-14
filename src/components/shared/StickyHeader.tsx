import React from "react";
import { Play, Search, X } from "lucide-react";
import RowCover from "./RowCover";

interface StickyHeaderProps {
  isScrolled: boolean;
  title: string;
  coverPath?: string;
  onPlayAll: () => void;
  isPlayDisabled: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchPlaceholder: string;
  extraActions?: React.ReactNode;
}

const StickyHeader: React.FC<StickyHeaderProps> = ({
  isScrolled,
  title,
  coverPath,
  onPlayAll,
  isPlayDisabled,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onSearchOpenChange,
  searchInputRef,
  searchPlaceholder,
  extraActions,
}) => {
  return (
    <div
      className={`flex items-center px-4 transition-all duration-300 ease-in-out backdrop-blur-xl ${
        isScrolled ? "h-16 bg-background" : "h-14 bg-background"
      }`}
    >
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isScrolled ? "max-w-2xl opacity-100 mr-4" : "max-w-0 opacity-0 mr-0"
        }`}
      >
        <div className="flex items-center gap-4 whitespace-nowrap">
          <button
            onClick={onPlayAll}
            disabled={isPlayDisabled}
            className="w-10 h-10 rounded-full bg-brand-primary text-background flex items-center justify-center hover:scale-105 transition-transform shadow-md flex-shrink-0 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" className="ml-1" />
          </button>
          {coverPath && (
            <div className="w-10 h-10 rounded overflow-hidden shadow-sm flex-shrink-0">
              <RowCover path={coverPath} />
            </div>
          )}
          <span className="text-content font-bold text-lg truncate">
            {title}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-x-2">

        {extraActions}

        <div
          className={`group relative flex items-center transition-all duration-300 ease-out overflow-hidden bg-surface border ${
            isSearchOpen || searchQuery
              ? "w-64 md:w-80 rounded-lg border-brand-primary/50"
              : "w-10 h-10 rounded-full border-divider cursor-pointer hover:border-brand-primary shadow-sm"
          }`}
          onClick={() => {
            if (!isSearchOpen && !searchQuery) {
              onSearchOpenChange(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
        >
          <Search
            size={16}
            className={`absolute transition-all duration-300 ${
              isSearchOpen || searchQuery
                ? "left-3 text-brand-primary"
                : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted group-hover:text-brand-primary"
            }`}
          />

          <input
            ref={searchInputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={() => {
              if (!searchQuery) onSearchOpenChange(false);
            }}
            className={`w-full h-10 bg-transparent pl-9 pr-10 text-sm text-content placeholder:text-muted focus:outline-none transition-opacity duration-300 ${
              isSearchOpen || searchQuery ? "opacity-100" : "opacity-0 cursor-pointer"
            }`}
            readOnly={!isSearchOpen && !searchQuery}
          />

          {(isSearchOpen || searchQuery) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchChange("");
                onSearchOpenChange(false);
              }}
              className="absolute right-3 text-muted hover:text-content transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyHeader;