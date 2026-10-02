"use client";

import * as React from "react";
import { EmbedPDF, useRegistry } from "@embedpdf/core/react";
import type {
  PdfDocumentObject,
  PdfEngine,
  Rect,
  Rotation,
} from "@embedpdf/models";
import {
  DocumentManagerPluginPackage,
  useActiveDocument,
  useDocumentManagerCapability,
} from "@embedpdf/plugin-document-manager/react";
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { Rotate, RotatePluginPackage } from "@embedpdf/plugin-rotate/react";
import {
  ScrollPluginPackage,
  ScrollStrategy,
  useScroll,
  useScrollPlugin,
  type PageLayout,
  type ScrollerLayout,
  type VirtualItem,
} from "@embedpdf/plugin-scroll/react";
import {
  SearchLayer,
  SearchPluginPackage,
  useSearch,
} from "@embedpdf/plugin-search/react";
import {
  CopyToClipboard,
  SelectionPluginPackage,
  useSelectionCapability,
  useSelectionPlugin,
} from "@embedpdf/plugin-selection/react";
import {
  ThumbImg,
  ThumbnailPluginPackage,
  useThumbnailCapability,
  useThumbnailPlugin,
  type ThumbMeta,
} from "@embedpdf/plugin-thumbnail/react";
import { TilingLayer, TilingPluginPackage } from "@embedpdf/plugin-tiling/react";
import {
  useIsViewportGated,
  useViewportCapability,
  useViewportElement,
  useViewportRef,
  ViewportElementContext,
  ViewportPluginPackage,
} from "@embedpdf/plugin-viewport/react";
import {
  useZoom,
  ZoomMode,
  ZoomPluginPackage,
} from "@embedpdf/plugin-zoom/react";
import { flushSync } from "react-dom";

import { loadSharedPdfEngine } from "@/lib/pdf-thumbnail-utils";
import { Button } from "@openbitfun/ui";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openbitfun/ui";
import { Input } from "@openbitfun/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openbitfun/ui";
import { ScrollArea } from "@openbitfun/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openbitfun/ui";
import { Separator } from "@openbitfun/ui";
import { Spinner } from "@openbitfun/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openbitfun/ui";
import {
  DocumentViewerSidebarSkeleton,
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/tools/document-viewers/shared/document-viewer-sidebar";
import { IconPlaceholder } from "@/components/icon-placeholder";
import { useI18n } from "@/infrastructure/i18n";

import {
  DEFAULT_ZOOM,
  ZOOM_OPTIONS,
  PAGE_GAP,
  THUMBNAIL_PAGE_WIDTH,
  THUMBNAIL_IMAGE_PADDING,
  THUMBNAIL_WIDTH,
  THUMBNAIL_LABEL_HEIGHT,
  THUMBNAIL_GAP,
  THUMBNAIL_PANE_PADDING_Y,
  THUMBNAIL_SIDEBAR_WIDTH_CLASS,
  THUMBNAIL_SIDEBAR_CLOSED_CLASS,
  PAGE_BASE_RENDER_MAX_SCALE,
  PAGE_BASE_RENDER_DPR,
  PDF_SEARCH_DEBOUNCE_MS,
  TEXT_SELECTION_BACKGROUND,
  THUMBNAIL_FOCUS_RING_CLASS,
  DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR,
  ZOOM_MODE_LABELS,
  toZoomLevel,
  isZoomMode,
  resolveDefaultScrollAreaViewport,
  PDFViewerScrollAreaResolverContext,
  PageRotationDeltas,
  ThumbnailSelectionMode,
  getPageIndexRange,
  arePageIndexSetsEqual,
  normalizeRotation,
  useSharedPdfEngine,
  rotationToDegrees,
  normalizeDegrees,
  ensurePdfExtension,
  getPdfDownloadFileName,
  getRotatedPdfDownloadFileName,
  downloadBlob,
  downloadPdfWithPageRotations,
  getThumbnailMetaForPage,
  buildThumbnailLayout,
  getVisibleThumbnailItems,
} from "./hooks";

import {
  PDFViewerFallbackShell,
  PDFViewerLoadingSkeleton,
  PDFViewerFileActionsMenu,
  PDFViewerPageNumberControl,
  PDFViewerSearchControl,
  PDFViewerToolbar,
} from "./FallbackShell";

export type PDFViewerPageOverlayProps = {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  rotation: number;
};

export type PDFViewerHandle = {
  scrollToPage: (pageNumber: number, options?: ScrollIntoViewOptions) => void;
  scrollToPageArea: (
    pageNumber: number,
    area: { top: number; left?: number; width?: number; height?: number },
    options?: ScrollToOptions
  ) => void;
  getViewportElement: () => HTMLDivElement | null;
};

export type PDFViewerScrollAreaViewportResolver = (
  container: HTMLDivElement
) => HTMLDivElement | null;

export type PDFViewerZoomLevel = number | "fit-page" | "fit-width" | "automatic";

export type PDFViewerProps = {
  className?: string;
  defaultZoom?: PDFViewerZoomLevel;
  fileName?: string;
  resolveScrollAreaViewport?: PDFViewerScrollAreaViewportResolver;
  showDownload?: boolean;
  showToolbar?: boolean;
  showRotateControls?: boolean;
  showUpload?: boolean;
  src?: string;
  toolbarActions?: React.ReactNode;
  pageClassName?: (pageNumber: number) => string | undefined;
  renderPageOverlay?: (props: PDFViewerPageOverlayProps) => React.ReactNode;
  onActivePageChange?: (pageNumber: number) => void;
  onDocumentLoadSuccess?: (numPages: number) => void;
  onPdfUpload?: (file: File) => void;
  onPagePointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void;
  onPagePointerMove?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void;
  onPagePointerUp?: (
    event: React.PoerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void;
  onPagePointerCancel?: (
    event: React.PointerEvent<HTMLDivElement>,
    pageNumber: number
  ) => void;
};

const PDFViewer = React.forwardRef<HTMLDivElement, PDFViewerProps>(
  (
    {
      className,
      defaultZoom = DEFAULT_ZOOM,
      fileName,
      resolveScrollAreaViewport,
      showDownload = true,
      showToolbar = true,
      showRotateControls = true,
      showUpload = true,
      src,
      toolbarActions,
      pageClassName,
      renderPageOverlay,
      onActivePageChange,
      onDocumentLoadSuccess,
      onPdfUpload,
      onPagePointerDown,
      onPagePointerMove,
      onPagePointerUp,
      onPagePointerCancel,
    },
    ref
  ) => {
    const registry = useRegistry();
    const { activeDocument } = useActiveDocument();
    const { provides: documentManager } = useDocumentManagerCapability();
    const { plugin: scrollPlugin } = useScrollPlugin();
    const { plugin: selectionPlugin } = useSelectionPlugin();
    const { plugin: thumbnailPlugin } = useThumbnailPlugin();

    const documentId = activeDocument?.id;

    const { engine, error: engineError } = useSharedPdfEngine();

    const [pageRotationDeltas, setPageRotationDeltas] = React.useState<PageRotationDeltas>(new Map());
    const [basePageRotations, setBasePageRotations] = React.useState<Rotation[]>([]);
    const [pdfDocument, setPdfDocument] = React.useState<PdfDocumentObject | null>(null);
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [sidebarInline, setSidebarInline] = React.useState(false);
    const [activePage, setActivePage] = React.useState(1);
    const [zoomLevel, setZoomLevel] = React.useState<ZoomMode | number>(DEFAULT_ZOOM);
    const [currentZoomLevel, setCurrentZoomLevel] = React.useState(DEFAULT_ZOOM);
    const [preparingDownload, setPreparingDownload] = React.useState(false);
    const [selectedPageIndexes, setSelectedPageIndexes] = React.useState<Set<number>>(new Set());

    const openDocument = React.useCallback(async () => {
      if (!documentManager || !src) return;

      try {
        const result = await documentManager.openDocumentUrl({
          src,
          fileName: fileName || src.split("/").pop() || "document.pdf",
          autoActivate: true,
        });

        const doc = await result.toPromise();
        setPdfDocument(doc);
        setBasePageRotations(doc.pages.map((p) => normalizeRotation(p.rotation)));
        setPageRotationDeltas(new Map());
        onDocumentLoadSuccess?.(doc.pageCount);
      } catch (error) {
        console.error("Failed to open document:", error);
      }
    }, [documentManager, src, fileName, onDocumentLoadSuccess]);

    React.useEffect(() => {
      openDocument();
    }, [openDocument]);

    const handleRotate = React.useCallback(
      (direction: 1 | -1) => {
        if (!documentId) return;

        setPageRotationDeltas((prev) => {
          const next = new Map(prev);
          const currentPageRotation = next.get(activePage - 1) ?? 0;
          next.set(activePage - 1, normalizeRotation(currentPageRotation + direction));
          return next;
        });
      },
      [documentId, activePage]
    );

    const handleDownload = React.useCallback(async () => {
      if (!documentId || !src || !fileName) return;

      setPreparingDownload(true);
      try {
        await downloadPdfWithPageRotations({
          fileName: getPdfDownloadFileName(fileName, src),
          pageRotationDeltas,
          src,
        });
      } finally {
        setPreparingDownload(false);
      }
    }, [documentId, src, fileName, pageRotationDeltas]);

    const handleUploadFile = React.useCallback(
      (file: File) => {
        const url = URL.createObjectURL(file);
        // Reload with new file
        // This would need integration with the document manager
      },
      []
    );

    const handlePageChange = React.useCallback(
      (pageNumber: number) => {
        const boundedPageNumber = Math.min(
          pdfDocument?.pages.length ?? 1,
          Math.max(1, pageNumber)
        );
        setActivePage(boundedPageNumber);
        onActivePageChange?.(boundedPageNumber);
      },
      [pdfDocument, onActivePageChange]
    );

    const handleZoomChange = React.useCallback(
      (level: ZoomMode | number) => {
        setZoomLevel(level);
        setCurrentZoomLevel(
          typeof level === "number" ? level : DEFAULT_ZOOM
        );
      },
      []
    );

    const handleToggleSidebar = React.useCallback(() => {
      setSidebarOpen((prev) => !prev);
    }, []);

    if (engineError) {
      return (
        <PDFViewerFallbackShell
          className={className}
          defaultZoom={defaultZoom}
          errorMessage={engineError.message}
          showDownload={showDownload}
          showRotateControls={showRotateControls}
          showToolbar={showToolbar}
          showUpload={showUpload}
          sidebarOpen={sidebarOpen}
          state="error"
          toolbarActions={toolbarActions}
          onUploadFile={onPdfUpload}
        />
      );
    }

    if (!engine) {
      return (
        <PDFViewerFallbackShell
          className={className}
          defaultZoom={defaultZoom}
          showDownload={showDownload}
          showRotateControls={showRotateControls}
          showToolbar={showToolbar}
          showUpload={showUpload}
          sidebarOpen={sidebarOpen}
          state="loading"
          toolbarActions={toolbarActions}
          onUploadFile={onPdfUpload}
        />
      );
    }

    if (!documentId) {
      return (
        <PDFViewerFallbackShell
          className={className}
          defaultZoom={defaultZoom}
          showDownload={showDownload}
          showRotateControls={showRotateControls}
          showToolbar={showToolbar}
          showUpload={showUpload}
          sidebarOpen={sidebarOpen}
          state="empty"
          toolbarActions={toolbarActions}
          onUploadFile={onPdfUpload}
        />
      );
    }

    const { provides: scroll } = useScroll(documentId);
    const { provides: selection } = useSelectionCapability();
    const { provides: viewport } = useViewportCapability();
    const isGated = useIsViewportGated(documentId);
    const viewportGap = viewport?.getViewportGap() ?? 0;

    const viewportElementRef = React.useRef<HTMLDivElement | null>(null);
    const handle = React.useRef<PDFViewerHandle>({
      scrollToPage: handlePageChange,
      scrollToPageArea: (pageNumber, area, options) => {
        scroll?.scrollToPage({
          pageNumber,
          ...(area
            ? {
                pageCoordinates: { x: area.left ?? 0, y: area.top ?? 0 },
              }
            : {}),
          behavior: options?.behavior,
        });
      },
      getViewportElement: () => viewportElementRef.current,
    });

    React.useImperativeHandle(ref, () => handle.current, [handlePageChange, scroll]);

    return (
      <div
        ref={viewportElementRef}
        data-slot="pdf-viewer"
        className={cn(
          "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-background",
          className
        )}
      >
        {showToolbar ? (
          <PDFViewerToolbar
            activePage={activePage}
            controlsDisabled={!documentId}
            currentZoomLevel={currentZoomLevel}
            downloadDisabled={!documentId}
            isPreparingDownload={preparingDownload}
            numPages={pdfDocument?.pages.length ?? 0}
            searchControl={
              <PDFViewerSearchControl
                documentId={documentId}
                controlsDisabled={!documentId}
              />
            }
            sidebarOpen={sidebarOpen}
            showDownload={showDownload}
            showRotateControls={showRotateControls}
            showUpload={showUpload}
            toolbarActions={toolbarActions}
            onDownload={handleDownload}
            onPageChange={handlePageChange}
            onRotate={handleRotate}
            onToggleSidebar={handleToggleSidebar}
            onUploadFile={handleUploadFile}
            onZoomChange={handleZoomChange}
            zoomLevel={zoomLevel}
          />
        ) : null}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {sidebarOpen ? (
            <div className={cn(THUMBNAIL_SIDEBAR_WIDTH_CLASS, sidebarInline ? "" : THUMBNAIL_SIDEBAR_CLOSED_CLASS)}>
              <PDFViewerThumbnails
                basePageRotations={basePageRotations}
                documentId={documentId}
                activePage={activePage}
                pageCount={pdfDocument?.pages.length ?? 0}
                pageRotationDeltas={pageRotationDeltas}
                pdfDocument={pdfDocument}
                selectedPageIndexes={selectedPageIndexes}
                onSelectPage={(pageNumber, mode) => {
                  const nextSelection = new Set(selectedPageIndexes);
                  const pageIndex = pageNumber - 1;

                  switch (mode) {
                    case "replace":
                      nextSelection.clear();
                      nextSelection.add(pageIndex);
                      break;
                    case "toggle":
                      if (nextSelection.has(pageIndex)) {
                        nextSelection.delete(pageIndex);
                      } else {
                        nextSelection.add(pageIndex);
                      }
                      break;
                    case "range":
                      if (selectedPageIndexes.size > 0) {
                        const lastSelected = Math.max(...selectedPageIndexes);
                        const range = getPageIndexRange(lastSelected, pageIndex);
                        nextSelection.clear();
                        range.forEach((idx) => nextSelection.add(idx));
                      } else {
                        nextSelection.add(pageIndex);
                      }
                      break;
                  }
                  setSelectedPageIndexes(nextSelection);
                }}
              />
            </div>
          ) : null}
          <ViewportElementContext.Provider value={useViewportRef(documentId)}>
            <PDFViewerScrollAreaViewport
              className={cn("flex-1 min-h-0")}
              documentId={documentId}
            >
              {isGated ? null : (
                <>
                  <GlobalPointerProvider documentId={documentId}>
                    <PagePointerProvider documentId={documentId} pageIndex={activePage - 1}>
                      <div className="relative flex min-h-0 flex-1 overflow-auto bg-muted/30">
                        <RenderLayer documentId={documentId} />
                        <SearchLayer documentId={documentId} />
                        <TilingLayer documentId={documentId} />
                      </div>
                    </PagePointerProvider>
                  </GlobalPointerProvider>
                  <PDFViewerTextSelectionLayer
                    documentId={documentId}
                    pageIndex={activePage - 1}
                    scale={currentZoomLevel}
                  />
                </>
              )}
            </PDFViewerScrollAreaViewport>
          </ViewportElementContext.Provider>
        </div>
      </div>
    );
  }
);

function PDFViewerThumbnails({
  basePageRotations,
  documentId,
  activePage,
  pageCount,
  pageRotationDeltas,
  pdfDocument,
  selectedPageIndexes,
  onSelectPage,
}: {
  basePageRotations: Rotation[];
  documentId: string;
  activePage: number;
  pageCount: number;
  pageRotationDeltas: PageRotationDeltas;
  pdfDocument: PdfDocumentObject | null;
  selectedPageIndexes: Set<number>;
  onSelectPage: (pageNumber: number, mode: ThumbnailSelectionMode) => void;
}) {
  const { plugin: thumbnailPlugin } = useThumbnailPlugin();

  const thumbnailScope = React.useMemo(
    () => thumbnailPlugin?.provides?.forDocument?.(documentId) ?? null,
    [documentId, thumbnailPlugin]
  );

  const windowState = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        if (!thumbnailScope) return () => undefined;
        return thumbnailScope.onWindow?.(() => onStoreChange()) ?? (() => {});
      },
      [thumbnailScope]
    ),
    React.useCallback(
      () => thumbnailScope?.getWindow?.() ?? null,
      [thumbnailScope]
    ),
    () => null
  );

  const hasWindowState = Boolean(windowState);
  const paddingY = thumbnailPlugin?.cfg?.paddingY ?? 0;
  const thumbnailLayout = React.useMemo(
    () =>
      buildThumbnailLayout({
        basePageRotations,
        pageRotationDeltas,
        pdfDocument,
        width: thumbnailPlugin?.cfg?.width ?? THUMBNAIL_WIDTH,
        gap: thumbnailPlugin?.cfg?.gap ?? THUMBNAIL_GAP,
        imagePadding: thumbnailPlugin?.cfg?.imagePadding ?? 0,
        labelHeight: thumbnailPlugin?.cfg?.labelHeight ?? THUMBNAIL_LABEL_HEIGHT,
        paddingY,
      }),
    [
      basePageRotations,
      pageRotationDeltas,
      pdfDocument,
      paddingY,
      thumbnailPlugin,
    ]
  );

  const effectiveWindowState = React.useMemo(() => {
    if (!thumbnailLayout) return windowState;

    const items = getVisibleThumbnailItems({
      buffer: thumbnailPlugin?.cfg?.buffer ?? 3,
      clientHeight: 0, // This would be updated via scroll listener
      items: thumbnailLayout.items,
      scrollTop: 0,
    });

    return {
      start: items[0]?.pageIndex ?? -1,
      end: items.at(-1)?.pageIndex ?? -1,
      items,
      totalHeight: thumbnailLayout.totalHeight,
    };
  }, [thumbnailLayout, thumbnailPlugin, windowState]);

  return (
    <PDFViewerThumbnailScrollArea
      documentId={documentId}
      basePageRotations={basePageRotations}
      pageRotationDeltas={pageRotationDeltas}
      pdfDocument={pdfDocument}
      activePage={activePage}
      pageCount={pageCount}
      selectedPageIndexes={selectedPageIndexes}
      onSelectPage={onSelectPage}
      effectiveWindowState={effectiveWindowState}
      thumbnailPlugin={thumbnailPlugin}
      thumbnailScope={thumbnailScope}
    />
  );
}

function PDFViewerThumbnailScrollArea({
  documentId,
  basePageRotations,
  pageRotationDeltas,
  pdfDocument,
  activePage,
  pageCount,
  selectedPageIndexes,
  onSelectPage,
  effectiveWindowState,
  thumbnailPlugin,
  thumbnailScope,
}: {
  documentId: string;
  basePageRotations: Rotation[];
  pageRotationDeltas: PageRotationDeltas;
  pdfDocument: PdfDocumentObject | null;
  activePage: number;
  pageCount: number;
  selectedPageIndexes: Set<number>;
  onSelectPage: (pageNumber: number, mode: ThumbnailSelectionMode) => void;
  effectiveWindowState: ReturnType<typeof getVisibleThumbnailItems> & { totalHeight: number };
  thumbnailPlugin: ReturnType<typeof useThumbnailPlugin>["plugin"];
  thumbnailScope: ReturnType<typeof useThumbnailPlugin>["plugin"] extends { provides: { forDocument: (id: string) => any } } ? ReturnType<ReturnType<typeof useThumbnailPlugin>["plugin"]["provides"]["forDocument"]> : null;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const thumbnailListboxId = React.useId();
  const activeDescendantId =
    activePage > 0 ? `${thumbnailListboxId}-page-${activePage}` : undefined;

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
      ref={viewportRef}
      className="h-full w-full overflow-auto p-2 group/pdf-thumbnail-sidebar"
      role="listbox"
      aria-label="PDF pages"
      aria-activedescendant={activeDescendantId}
      aria-multiselectable="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative"
        style={{ height: effectiveWindowState?.totalHeight ?? 0 }}
      >
        {effectiveWindowState?.items?.map((meta) => (
          <ThumbnailItem
            key={meta.pageIndex}
            documentId={documentId}
            meta={meta}
            pageRotationDeltas={pageRotationDeltas}
            isActive={meta.pageIndex + 1 === activePage}
            isSelected={selectedPageIndexes.has(meta.pageIndex)}
            listboxId={thumbnailListboxId}
            onSelectPage={onSelectPage}
          />
        ))}
      </div>
    </div>
  );
}

function ThumbnailItem({
  documentId,
  meta,
  pageRotationDeltas,
  isActive,
  isSelected,
  listboxId,
  onSelectPage,
}: {
  documentId: string;
  meta: ThumbMeta;
  pageRotationDeltas: PageRotationDeltas;
  isActive: boolean;
  isSelected: boolean;
  listboxId: string;
  onSelectPage: (pageNumber: number, mode: ThumbnailSelectionMode) => void;
}) {
  const pageNumber = meta.pageIndex + 1;
  const pageRotationDelta = pageRotationDeltas.get(meta.pageIndex) ?? 0;
  const { t, formatNumber } = useI18n("tools");
  const padding = meta.padding ?? 0;

  const thumbnailImageStyle: React.CSSProperties =
    pageRotationDelta % 2 === 1
      ? {
          height: meta.width,
          transform: `rotate(${rotationToDegrees(pageRotationDelta)}deg)`,
          width: meta.height,
        }
      : {
          height: meta.height,
          transform:
            pageRotationDelta === 0
              ? undefined
              : `rotate(${rotationToDegrees(pageRotationDelta)}deg)`,
          width: meta.width,
        };

  return (
    <div
      data-pdf-viewer-thumbnail={pageNumber}
      className={cn(
        "absolute right-0 left-0 flex justify-center",
        isActive && "z-10"
      )}
      style={{ top: meta.top, height: meta.wrapperHeight }}
    >
      <div
        id={`${listboxId}-page-${pageNumber}`}
        role="option"
        data-pdf-viewer-thumbnail-option={pageNumber}
        aria-current={isActive ? "page" : undefined}
        aria-label={t("editor.pdfViewer.pageAriaLabel", { page: formatNumber(pageNumber) })}
        aria-posinset={pageNumber}
        aria-selected={isSelected}
        aria-setsize={pageCount}
        data-selected={isSelected ? "" : undefined}
        className={cn(
          "flex h-full w-full cursor-default flex-col items-center justify-between rounded-md px-2 py-0 text-xs transition-shadow outline-none select-none hover:bg-accent",
          isActive || isSelected
            ? "bg-accent text-foreground"
            : "text-muted-foreground",
          isActive && THUMBNAIL_FOCUS_RING_CLASS
        )}
        onClick={(event) => {
          const mode = event.shiftKey
            ? "range"
            : event.metaKey || event.ctrlKey
              ? "toggle"
              : "replace";

          onSelectPage(pageNumber, mode);
        }}
      >
        <span
          className="mt-0 flex items-center justify-center overflow-hidden rounded-md bg-transparent"
          style={{
            width: meta.width + padding * 2,
            height: meta.height + padding * 2,
            padding: padding,
          }}
        >
          <ThumbImg
            documentId={documentId}
            meta={meta}
            className="block rounded-sm object-contain"
            style={thumbnailImageStyle}
          />
        </span>
        <span
          className="flex items-center justify-center tabular-nums"
          style={{ height: meta.labelHeight }}
        >
          <span className="flex min-w-5 items-center justify-center px-1.5 text-center leading-5">
            {pageNumber}
          </span>
        </span>
      </div>
    </div>
  );
}

function PDFViewerTextSelectionLayer({
  documentId,
  pageIndex,
  scale,
}: {
  documentId: string;
  pageIndex: number;
  scale: number;
}) {
  const { plugin: selectionPlugin } = useSelectionPlugin();
  const [rects, setRects] = React.useState<Rect[]>([]);

  React.useEffect(() => {
    if (!selectionPlugin) return;

    return selectionPlugin.registerSelectionOnPage({
      documentId,
      pageIndex,
      onRectsChange: ({ rects: nextRects }) => {
        setRects(nextRects);
      },
    });
  }, [documentId, pageIndex, selectionPlugin]);

  if (!rects.length) return null;

  return (
    <>
      {rects.map((rect, index) => (
        <div
          key={`${index}-${rect.origin.x}-${rect.origin.y}`}
          className="pointer-events-none absolute"
          style={{
            background: TEXT_SELECTION_BACKGROUND,
            height: rect.size.height * scale,
            left: rect.origin.x * scale,
            top: rect.origin.y * scale,
            width: rect.size.width * scale,
          }}
        />
      ))}
    </>
  );
}

function PDFViewerScrollAreaViewport({
  children,
  className,
  documentId,
}: {
  children: React.ReactNode;
  className?: string;
  documentId: string;
}) {
  const viewportRef = useViewportRef(documentId);
  const { provides: viewport } = useViewportCapability();
  const isGated = useIsViewportGated(documentId);
  const viewportGap = viewport?.getViewportGap() ?? 0;

  return (
    <ViewportElementContext.Provider value={viewportRef}>
      <div
        className={cn("flex-1 min-h-0 relative overflow-auto", className)}
        style={{ padding: viewportGap }}
      >
        {isGated ? null : children}
      </div>
    </ViewportElementContext.Provider>
  );
}

function PDFViewerViewportBridge({
  viewportElementRef,
}: {
  viewportElementRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const elementRef = useViewportElement();

  React.useEffect(() => {
    viewportElementRef.current = elementRef?.current ?? null;
  });

  return null;
}

function setPdfViewerRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (!ref) return;

  if (typeof ref === "function") {
    ref(value);
  } else {
    ref.current = value;
  }
}

function PDFViewerScrollArea({
  children,
  className,
  viewportClassName,
  viewportProps,
  viewportRef,
}: {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  viewportProps?: React.HTMLAttributes<HTMLDivElement>;
  viewportRef?: React.Ref<HTMLDivElement>;
}) {
  const resolveScrollAreaViewport = React.useContext(
    PDFViewerScrollAreaResolverContext
  );
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { className: viewportPropsClassName, ...resolvedViewportProps } =
    viewportProps ?? {};

  const setViewportRef = React.useCallback(
    (viewport: HTMLDivElement | null) => {
      setPdfViewerRef(viewportRef, viewport);
    },
    [viewportRef]
  );

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewport = resolveScrollAreaViewport(container);

    if (!viewport) {
      console.error(
        `PDFViewer could not resolve the scroll viewport. Add ${DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR} to your ScrollArea viewport or pass resolveScrollAreaViewport.`
      );
      return;
    }

    setViewportRef(viewport);

    return () => setViewportRef(null);
  }, [resolveScrollAreaViewport, setViewportRef]);

  return (
    <div
      ref={containerRef}
      data-slot="pdf-viewer-scroll-area"
      className={cn("size-full min-h-0", className)}
    >
      <ScrollArea className="size-full min-h-0">
        <div
          {...resolvedViewportProps}
          data-slot="pdf-viewer-scroll-content"
          className={cn(
            "min-h-full",
            viewportPropsClassName,
            viewportClassName
          )}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}

PDFViewer.displayName = "PDFViewer";

export default PDFViewer;