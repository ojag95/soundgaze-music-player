import React from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TableHeaderProps {
  isScrolled: boolean;
  gridTemplate: string;
  isMobile: boolean;
  visibleColumns: {
    album?: boolean;
    genre?: boolean;
    date?: boolean;
    time?: boolean;
  };
}

const TableHeader: React.FC<TableHeaderProps> = ({
  isScrolled,
  gridTemplate,
  isMobile,
  visibleColumns,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`grid gap-4 px-4 py-2 border-b border-divider text-xs font-medium uppercase transition-colors duration-300 ${
        isScrolled
          ? "bg-background backdrop-blur-xl text-muted/80"
          : "bg-background text-muted"
      }`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="w-8 text-center">#</div>
      <div>{t("common.title", "Título")}</div>
      {!isMobile && visibleColumns.album && <div>{t("common.album", "Álbum")}</div>}
      {!isMobile && visibleColumns.genre && <div>{t("common.genre", "Género")}</div>}
      {!isMobile && visibleColumns.date && <div>{t("common.year", "Año")}</div>}
      {visibleColumns.time && (
        <div className="flex justify-end w-12">
          <Clock size={16} />
        </div>
      )}
    </div>
  );
};

export default TableHeader;