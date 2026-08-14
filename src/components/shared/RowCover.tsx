import React, { useState, useEffect } from "react";
import { Disc3 } from "lucide-react";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";

interface RowCoverProps {
  path: string;
}

const RowCover: React.FC<RowCoverProps> = ({ path }) => {
  const [error, setError] = useState(false);
  const { basePath, coverCacheBuster } = useLibrarySettingsStore();

  useEffect(() => {
    setError(false);
  }, [path, basePath, coverCacheBuster]);

  const coverUrl = `cover://localhost/?path=${encodeURIComponent(path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;

  return (
    <div className="w-full h-full flex items-center justify-center bg-surface overflow-hidden text-muted">
      {!error ? (
        <img
          src={coverUrl}
          alt="Cover"
          loading="lazy"
          decoding="async"
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <Disc3 size={16} />
      )}
    </div>
  );
};

export default RowCover;