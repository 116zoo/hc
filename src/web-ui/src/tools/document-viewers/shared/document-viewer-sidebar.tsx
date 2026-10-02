"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useI18n } from "@/infrastructure/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

interface DocumentViewerSidebarProps {
  documentId: string;
  activePage: number;
  pageCount: number;
  selectedPageIndexes: Set<number>;
  onSelectPage: (pageNumber: number, mode: "replace" | "toggle" | "range") => void;
  renderThumbnail?: (pageNumber: number, meta: any) => React.ReactNode;
  className?: string;
  showLabels?: boolean;
}

export function DocumentViewerSidebar({
  documentId,
  activePage,
  pageCount,
  selectedPageIndexes,
  onSelectPage,
  renderThumbnail,
  className,
  showLabels = true,
}: DocumentViewerSidebarProps) {
  const { t } = useI18n("tools");
  const parentRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  const virtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 172,
    overscan: 5,
  });

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (pageCount < 1) return;

      const currentPage = activePage > 0 ? activePage : 1;
      let nextPage: number | null = null;

      if (event.key === "ArrowDown") {
        nextPage = Math.min(pageCount, currentPage + 1);
      } else if (event.key === "ArrowUp") {
        nextPage = Math.max(1, currentPage - 1);
      } else if (event.key === "Home") {
        nextPage = 1;
      } else if (event.key === "End") {
        nextPage = pageCount;
      } else if (event.key === " ") {
        event.preventDefault();
        onSelectPage(currentPage, "toggle");
        return;
      }

      if (nextPage === null) return;

      event.preventDefault();
      onSelectPage(nextPage, event.shiftKey ? "range" : "replace");
    },
    [activePage, onSelectPage, pageCount]
  );

  return (
    <div
      ref={parentRef}
      className={cn(
        "flex h-full w-full flex-col overflow-auto bg-background",
        className
      )}
      role="listbox"
      aria-label={t("editor.pdfViewer.pagesSidebar")}
      aria-activedescendant={activePage > 0 ? `${listboxId}-page-${activePage}` : undefined}
      aria-multiselectable="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const pageNumber = virtualRow.index + 1;
        const isActive = pageNumber === activePage;
        const isSelected = selectedPageIndexes.has(virtualRow.index);

        return (
          <div
            key={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ThumbnailItem
              documentId={documentId}
              pageNumber={pageNumber}
              isActive={isActive}
              isSelected={isSelected}
              listboxId={listboxId}
              showLabels={showLabels}
              renderThumbnail={renderThumbnail}
              onClick={(mode) => onSelectPage(pageNumber, mode)}
            />
          </div>
        );
      })}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

interface ThumbnailItemProps {
  documentId: string;
  pageNumber: number;
  isActive: boolean;
  isSelected: boolean;
  listboxId: string;
  showLabels: boolean;
  renderThumbnail?: (pageNumber: number, meta: any) => React.ReactNode;
  onClick: (mode: "replace" | "toggle" | "range") => void;
}

function ThumbnailItem({
  documentId,
  pageNumber,
  isActive,
  isSelected,
  listboxId,
  showLabels,
  renderThumbnail,
  onClick,
}: ThumbnailItemProps) {
  const { t, formatNumber } = useI18n("tools");

  return (
    <div
      role="option"
      id={`${listboxId}-page-${pageNumber}`}
      aria-current={isActive ? "page" : undefined}
      aria-label={t("editor.pdfViewer.pageCount", {
        current: formatNumber(pageNumber),
        total: formatNumber(pageNumber),
      })}
      aria-selected={isSelected}
      aria-posinset={pageNumber}
      data-selected={isSelected ? "" : undefined}
      className={cn(
        "group relative flex h-full w-full cursor-default flex-col items-center justify-between rounded-md px-2 py-0 text-xs transition-shadow outline-none select-none hover:bg-accent",
        isActive || isSelected
          ? "bg-accent text-foreground"
          : "text-muted-foreground",
        isActive &&
          "group-focus-visible/pdf-thumbnail-sidebar:ring-2 group-focus-visible/pdf-thumbnail-sidebar:ring-ring group-focus-visible/pdf-thumbnail-sidebar:ring-offset-1 group-focus-visible/pdf-thumbnail-sidebar:ring-offset-background"
      )}
      onClick={(event) => {
        const mode = event.shiftKey
          ? "range"
          : event.metaKey || event.ctrlKey
            ? "toggle"
            : "replace";
        onClick(mode);
      }}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden rounded-md bg-transparent p-2">
        {renderThumbnail
          ? renderThumbnail(pageNumber, { pageNumber })
          : (
              <div className="flex w-full aspect-square items-center justify-center bg-muted rounded-sm">
                <span className="text-xs text-muted-foreground/50">{t("editor.pdfViewer.pageCount", { current: formatNumber(pageNumber), total: formatNumber(pageNumber) })}</span>
              </div>
            )}
      </div>
      {showLabels && (
        <div className="flex items-center justify-center text-center leading-5">
          <span className="flex min-w-5 items-center justify-center px-1.5">
            {formatNumber(pageNumber)}
          </span>
        </div>
      )}
    </div>
  );
}

export function DocumentViewerSidebarSkeleton({ className, inline = false }: { className?: string; inline?: boolean }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="h-16 bg-muted rounded mb-2" />
      <div className="h-16 bg-muted rounded mb-2" />
      <div className="h-16 bg-muted rounded mb-2" />
      <div className="h-16 bg-muted rounded mb-2" />
      <div className="h-16 bg-muted rounded mb-2" />
    </div>
  );
}

export function useInlineThumbnailSidebar() {
  return false;
}

export function useElementWidth(element: React.RefObject<HTMLElement>) {
  return React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        const el = element.current;
        if (!el) return () => {};
        const observer = new ResizeObserver(() => onStoreChange());
        observer.observe(el);
        return () => observer.disconnect();
      },
      [element]
    ),
    () => element.current?.clientWidth ?? 0,
    () => 0
  );
}