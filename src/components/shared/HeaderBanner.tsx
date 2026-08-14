import React from "react";
import RowCover from "./RowCover";

interface HeaderBannerProps {
  covers: string[];
  subtitle: string;
  title: string;
  description: string;
  emptyFallback?: React.ReactNode; 
}

const HeaderBanner: React.FC<HeaderBannerProps> = ({
  covers,
  subtitle,
  title,
  description,
  emptyFallback,
}) => {
  return (
    <div className="flex items-end gap-8 p-6 rounded-xl mb-6 mt-4 transition-opacity flex-wrap md:flex-nowrap">
      
      {covers.length > 0 ? (
        <div className="relative w-44 h-40 flex-shrink-0 flex items-end justify-center ml-4">
          {covers.map((path, index) => {
            let transformClasses = "";
            if (covers.length === 3) {
              if (index === 0) transformClasses = "-rotate-12 -translate-x-10 translate-y-1 z-0 opacity-80 scale-90";
              if (index === 1) transformClasses = "-rotate-6 -translate-x-5 translate-y-1 z-10 opacity-95 scale-95";
              if (index === 2) transformClasses = "rotate-3 translate-x-2 z-20 scale-100";
            } else if (covers.length === 2) {
              if (index === 0) transformClasses = "-rotate-6 -translate-x-6 translate-y-1 z-0 opacity-90 scale-95";
              if (index === 1) transformClasses = "rotate-3 translate-x-2 z-10 scale-100";
            } else if (covers.length === 1) {
              transformClasses = "z-10";
            }

            const sizeClass = covers.length === 1 ? "w-36 h-36" : "w-32 h-32";

            return (
              <div
                key={`${path}-${index}`}
                className={`absolute bottom-0 ${sizeClass} rounded-lg overflow-hidden shadow-2xl border-2 border-background origin-bottom transition-all duration-700 ease-out ${transformClasses}`}
              >
                <RowCover path={path} />
              </div>
            );
          })}
        </div>
      ) : (
        emptyFallback
      )}

      <div className="min-w-0 z-10">
        <span className="text-xs font-bold uppercase text-brand-primary tracking-wider">
          {subtitle}
        </span>
        <h2 className="text-4xl font-extrabold text-content tracking-tight md:text-5xl truncate mt-1 mb-2 drop-shadow-sm py-2">
          {title}
        </h2>
        <p className="text-sm text-muted">
          {description}
        </p>
      </div>
    </div>
  );
};

export default HeaderBanner;