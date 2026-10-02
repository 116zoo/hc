"use client";

import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
import { Spinner } from "@openbitfun/ui";
import { IconPlaceholder } from "@/components/icon-placeholder";
import { Button } from "@openbitfun/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@openbitfun/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openbitfun/ui";
import { Input } from "@openbitfun/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@openbitfun/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@openbitfun/ui";
import { Separator } from "@openbitfun/ui";
import { useI18n } from "@/infrastructure/i18n";

import {
  DEFAULT_ZOOM,
  ZOOM_MODE_LABELS,
  toZoomLevel,
  isZoomMode,
  ZOOM_OPTIONS,
  PDFViewerZoomLevel,
} from "./hooks";

interface PDFViewerFallbackShellProps {
  className?: string;
  defaultZoom: PDFViewerZoomLevel;
  errorMessage?: string;
  showDownload: boolean;
  showRotateControls: boolean;
  showToolbar: boolean;
  showUpload: boolean;
  sidebarOpen: boolean;
  state: "loading" | "error" | "empty";
  toolbarActions?: React.ReactNode;
  onUploadFile?: (file: File) => void;
}

function PDFViewerLoadingSkeleton({
  sidebarOpen,
  sidebarInline,
}: {
  sidebarOpen: boolean;
  sidebarInline: boolean;
}) {
  return (
    <div className="absolute inset-0 z-20 flex bg-muted/30">
      {sidebarOpen ? (
        <DocumentViewerSidebarSkeleton
          className="w-40"
          inline={sidebarInline}
        />
      ) : null}
      <div className="grid min-w-0 flex-1 place-items-center">
        <Spinner className="size-4" />
      </div>
    </div>
  );
}

function DocumentViewerSidebarSkeleton({
  className,
  inline,
}: {
  className?: string;
  inline: boolean;
}) {
  return (
    <div className={cn("animate-pulse bg-muted", className)}>
      <div className="h-16 bg-muted/50 mb-2 rounded" />
      <div className="h-16 bg-muted/50 mb-2 rounded" />
      <div className="h-16 bg-muted/50 mb-2 rounded" />
      <div className="h-16 bg-muted/50 mb-2 rounded" />
      <div className="h-16 bg-muted/50 mb-2 rounded" />
    </div>
  );
}

export function PDFViewerFallbackShell({
  className,
  defaultZoom,
  errorMessage = "Unable to load the PDF preview.",
  showDownload,
  showRotateControls,
  showToolbar,
  showUpload,
  sidebarOpen,
  state,
  toolbarActions,
  onUploadFile,
}: PDFViewerFallbackShellProps) {
  const { t } = useI18n("tools");

  return (
    <div
      data-slot="pdf-viewer"
      className={cn(
        "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-background",
        className
      )}
    >
      {showToolbar ? (
        <PDFViewerToolbar
          activePage={1}
          controlsDisabled
          currentZoomLevel={
            typeof defaultZoom === "number" ? defaultZoom : DEFAULT_ZOOM
          }
          zoomLevel={toZoomLevel(defaultZoom)}
          numPages={0}
          searchControl={
            <ToolbarTooltip label={t("editor.pdfViewer.searchText")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pdfViewer.searchText")}
                disabled
              >
                <IconPlaceholder
                  lucide="Search"
                  tabler="IconSearch"
                  hugeicons="Search01Icon"
                  phosphor="MagnifyingGlassIcon"
                  remixicon="RiSearchLine"
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
          }
          sidebarOpen={sidebarOpen}
          showDownload={showDownload}
          showRotateControls={showRotateControls}
          showUpload={showUpload}
          toolbarActions={toolbarActions}
          onPageChange={() => undefined}
          onRotate={() => undefined}
          onToggleSidebar={() => undefined}
          onUploadFile={onUploadFile}
          onZoomChange={() => undefined}
        />
      ) : null}
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30">
        {state === "loading" ? (
          <PDFViewerLoadingSkeleton sidebarInline sidebarOpen={sidebarOpen} />
        ) : null}
        {state === "error" ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6 text-sm text-muted-foreground">
            {errorMessage}
          </div>
        ) : null}
        {state === "empty" ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6 text-center text-sm text-muted-foreground">
            <div className="max-w-sm space-y-3">
              <div className="font-medium text-foreground">
                {t("editor.pdfViewer.uploadToPreview")}
              </div>
              <div>
                {t("editor.pdfViewer.passSrcOrUpload")}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function PDFViewerFileActionsMenu({
  downloadDisabled,
  isPreparingDownload = false,
  onDownload,
  onUploadFile,
  showDownload = false,
  showUpload = false,
}: {
  downloadDisabled?: boolean;
  isPreparingDownload?: boolean;
  onDownload?: () => void;
  onUploadFile?: (file: File) => void;
  showDownload?: boolean;
  showUpload?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { t } = useI18n("tools");

  if (!showDownload && !showUpload) return null;

  return (
    <>
      {showUpload && onUploadFile ? (
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const nextFile = event.target.files?.[0];

            if (nextFile) {
              onUploadFile(nextFile);
              event.currentTarget.value = "";
            }
          }}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("editor.pdfViewer.openPdfActions")}
          >
            <IconPlaceholder
              lucide="Ellipsis"
              tabler="IconDots"
              hugeicons="MoreHorizontalIcon"
              phosphor="DotsThreeIcon"
              remixicon="RiMoreLine"
              className="size-4"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {showDownload ? (
            <DropdownMenuItem disabled={downloadDisabled} onClick={onDownload}>
              {isPreparingDownload ? (
                <Spinner className="size-4" />
              ) : (
                <IconPlaceholder
                  lucide="Download"
                  tabler="IconDownload"
                  hugeicons="Download01Icon"
                  phosphor="DownloadSimpleIcon"
                  remixicon="RiDownload2Line"
                  className="size-4"
                />
              )}
              {t("editor.pdfViewer.download")}
            </DropdownMenuItem>
          ) : null}
          {showUpload && onUploadFile ? (
            <DropdownMenuItem onClick={() => inputRef.current?.click()}>
              <IconPlaceholder
                lucide="Upload"
                tabler="IconUpload"
                hugeicons="Upload01Icon"
                phosphor="UploadSimpleIcon"
                remixicon="RiUpload2Line"
                className="size-4"
              />
              {t("editor.pdfViewer.upload")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function PDFViewerPageNumberControl({
  activePage,
  controlsDisabled,
  numPages,
  onPageChange,
}: {
  activePage: number;
  controlsDisabled: boolean;
  numPages: number;
  onPageChange: (pageNumber: number) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const displayPage = numPages ? activePage : 1;
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftPage, setDraftPage] = React.useState(() => String(displayPage));
  const { t, formatNumber } = useI18n("tools");

  React.useEffect(() => {
    if (!isEditing) return;

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const applyPageDraft = React.useCallback(
    (value: string) => {
      const trimmedValue = value.trim();

      if (!trimmedValue) return;

      const parsedPage = Number(trimmedValue);

      if (!Number.isInteger(parsedPage)) return;

      onPageChange(Math.min(Math.max(parsedPage, 1), Math.max(numPages, 1)));
    },
    [numPages, onPageChange]
  );

  return (
    <div className="flex items-center text-sm whitespace-nowrap text-primary">
      <span>{t("editor.pdfViewer.page")}</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label={t("editor.pdfViewer.currentPage")}
          inputMode="numeric"
          pattern="[0-9]*"
          size="sm"
          value={draftPage}
          className="mx-1 w-14 min-w-14 rounded-md [&_[data-slot=input]]:text-center"
          onBlur={() => setIsEditing(false)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setDraftPage(nextValue);
            applyPageDraft(nextValue);
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-normal"
          aria-label={`${t("editor.pdfViewer.currentPageLabel")} ${displayPage}. ${t("editor.pdfViewer.editPageNumber")}`}
          disabled={controlsDisabled || !numPages}
          onClick={() => {
            setDraftPage(String(displayPage));
            setIsEditing(true);
          }}
        >
          {displayPage}
        </Button>
      )}
      <span>{t("editor.pdfViewer.of", { total: formatNumber(numPages || 0) })}</span>
    </div>
  );
}

function PDFViewerSearchControl({
  documentId,
  controlsDisabled,
}: {
  documentId: string;
  controlsDisabled: boolean;
}) {
  const { state, provides } = useSearch(documentId);
  const { provides: scroll } = useScroll(documentId);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const providesRef = React.useRef(provides);
  const scrollRef = React.useRef(scroll);
  const searchRequestIdRef = React.useRef(0);
  const hasActiveQuery = Boolean(searchQuery.trim());
  const resultLabel = isSearching
    ? "Searching"
    : !hasActiveQuery
      ? "No search"
      : state.total
        ? `${state.activeResultIndex + 1} / ${state.total}`
        : "No results";

  const scrollToResult = React.useCallback(
    (index: number) => {
      const result = state.results[index];

      if (!result || !scroll) return;

      const firstRect = result.rects[0];

      scroll.scrollToPage({
        pageNumber: result.pageIndex + 1,
        ...(firstRect
          ? {
              pageCoordinates: {
                x: firstRect.origin.x,
                y: firstRect.origin.y,
              },
              alignY: 30,
            }
          : {}),
        behavior: "auto",
      });
    },
    [scroll, state.results]
  );

  React.useEffect(() => {
    providesRef.current = provides;
    scrollRef.current = scroll;
  }, [provides, scroll]);

  const runSearch = React.useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearchQuery(query);

    const searchProvider = providesRef.current;
    const scrollProvider = scrollRef.current;

    if (!searchProvider) {
      setIsSearching(false);
      return;
    }

    if (!query) {
      searchProvider.stopSearch();
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchProvider.startSearch();
    searchProvider.searchAllPages(query).wait(
      (result) => {
        if (searchRequestIdRef.current !== requestId) return;

        const firstResult = result.results[0];

        if (firstResult && scrollProvider) {
          searchProvider.goToResult(0);
          const firstRect = firstResult.rects[0];

          scrollProvider.scrollToPage({
            pageNumber: firstResult.pageIndex + 1,
            ...(firstRect
              ? {
                  pageCoordinates: {
                    x: firstRect.origin.x,
                    y: firstRect.origin.y,
                  },
                  alignY: 30,
                }
              : {}),
            behavior: "auto",
          });
        }
        setIsSearching(false);
      },
      () => {
        if (searchRequestIdRef.current !== requestId) return;
        setIsSearching(false);
      }
    );
  }, []);

  React.useEffect(() => {
    if (!searchDraft.trim()) return;

    const timeoutId = window.setTimeout(() => {
      runSearch(searchDraft);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [runSearch, searchDraft]);

  const handleSearchDraftChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextDraft = event.target.value;

      setSearchDraft(nextDraft);

      if (nextDraft.trim()) {
        setIsSearching(true);
        return;
      }

      searchRequestIdRef.current += 1;
      setSearchQuery("");
      setIsSearching(false);
      provides?.stopSearch();
    },
    [provides]
  );

  const clearSearch = React.useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchDraft("");
    setSearchQuery("");
    setIsSearching(false);
    provides?.stopSearch();
  }, [provides]);

  const navigate = React.useCallback(
    (direction: 1 | -1) => {
      if (!provides || state.total === 0) return;

      const index =
        direction === 1 ? provides.nextResult() : provides.previousResult();

      scrollToResult(index);
    },
    [provides, scrollToResult, state.total]
  );

  const { t } = useI18n("tools");

  return (
    <Popover>
      <ToolbarTooltip label={t("editor.pdfViewer.searchText")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("editor.pdfViewer.searchText")}
            disabled={controlsDisabled}
          >
            <IconPlaceholder
              lucide="Search"
              tabler="IconSearch"
              hugeicons="Search01Icon"
              phosphor="MagnifyingGlassIcon"
              remixicon="RiSearchLine"
              className="size-4"
            />
          </Button>
        </PopoverTrigger>
      </ToolbarTooltip>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <Input
            placeholder={t("editor.pdfViewer.searchPlaceholder")}
            value={searchDraft}
            onChange={handleSearchDraftChange}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;

              event.preventDefault();
              if (event.shiftKey && state.total) {
                navigate(-1);
              } else if (state.total) {
                navigate(1);
              } else if (searchDraft.trim()) {
                runSearch(searchDraft);
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 text-xs text-muted-foreground">
              <div className="truncate">
                {state.total ? (
                  <>
                    <span className="text-primary">
                      {state.activeResultIndex + 1}
                    </span>
                    {` / ${state.total}`}
                  </>
                ) : (
                  resultLabel
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t("editor.pdfViewer.previousResult")}
                disabled={isSearching || state.total === 0}
                onClick={() => navigate(-1)}
              >
                <IconPlaceholder
                  lucide="ChevronLeft"
                  tabler="IconChevronLeft"
                  hugeicons="ArrowLeft01Icon"
                  phosphor="CaretLeftIcon"
                  remixicon="RiArrowLeftSLine"
                  className="size-4"
                />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t("editor.pdfViewer.nextResult")}
                disabled={isSearching || state.total === 0}
                onClick={() => navigate(1)}
              >
                <IconPlaceholder
                  lucide="ArrowRight"
                  tabler="IconArrowRight"
                  hugeicons="ArrowRight01Icon"
                  phosphor="ArrowRightIcon"
                  remixicon="RiArrowRightLine"
                  className="size-4"
                />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSearch}
            >
              {t("editor.pdfViewer.clearSearch")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface PDFViewerToolbarProps {
  activePage: number;
  controlsDisabled: boolean;
  currentZoomLevel: number;
  downloadDisabled?: boolean;
  isPreparingDownload?: boolean;
  numPages: number;
  searchControl: React.ReactNode;
  sidebarOpen: boolean;
  showDownload: boolean;
  showRotateControls: boolean;
  showUpload: boolean;
  toolbarActions?: React.ReactNode;
  onDownload?: () => void;
  onPageChange: (pageNumber: number) => void;
  onRotate: (direction: 1 | -1) => void;
  onToggleSidebar: () => void;
  onUploadFile?: (file: File) => void;
  onZoomChange: (zoomLevel: ZoomMode | number) => void;
  zoomLevel: ZoomMode | number;
}

function PDFViewerToolbar({
  activePage,
  controlsDisabled,
  currentZoomLevel,
  downloadDisabled = controlsDisabled,
  isPreparingDownload = false,
  numPages,
  searchControl,
  sidebarOpen,
  showDownload,
  showRotateControls,
  showUpload,
  toolbarActions,
  onDownload,
  onPageChange,
  onRotate,
  onToggleSidebar,
  onUploadFile,
  onZoomChange,
  zoomLevel,
}: PDFViewerToolbarProps) {
  const selectValue = isZoomMode(zoomLevel)
    ? zoomLevel
    : String(Number(currentZoomLevel.toFixed(2)));
  const zoomOptions = ZOOM_OPTIONS.includes(Number(currentZoomLevel.toFixed(2)))
    ? ZOOM_OPTIONS
    : [...ZOOM_OPTIONS, Number(currentZoomLevel.toFixed(2))].sort(
        (left, right) => left - right
      );

  const { t } = useI18n("tools");

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TooltipProvider>
          <ToolbarTooltip label={t("editor.pdfViewer.pagesSidebar")}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("editor.pdfViewer.pagesSidebar")}
              aria-pressed={sidebarOpen}
              data-active={sidebarOpen ? "" : undefined}
              className={cn(
                sidebarOpen &&
                  "bg-accent text-accent-foreground ring-1 ring-ring/40 ring-inset"
              )}
              disabled={controlsDisabled}
              onClick={onToggleSidebar}
            >
              <IconPlaceholder
                lucide="PanelLeft"
                tabler="IconLayoutSidebar"
                hugeicons="SidebarLeftIcon"
                phosphor="SidebarIcon"
                remixicon="RiLayoutLeftLine"
                className="size-4"
              />
            </Button>
          </ToolbarTooltip>
        </TooltipProvider>
        <PDFViewerPageNumberControl
          activePage={activePage}
          controlsDisabled={controlsDisabled}
          numPages={numPages}
          onPageChange={onPageChange}
        />
      </div>
      <TooltipProvider>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {showRotateControls ? (
            <>
              <div className="flex flex-none items-center gap-1">
                <ToolbarTooltip label={t("editor.pdfViewer.rotateCounterclockwise")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editor.pdfViewer.rotateCounterclockwise")}
                    disabled={controlsDisabled}
                    onClick={() => onRotate(-1)}
                  >
                    <IconPlaceholder
                      lucide="RotateCw"
                      tabler="IconRotateClockwise"
                      hugeicons="RotateClockwiseIcon"
                      phosphor="ArrowClockwiseIcon"
                      remixicon="RiClockwiseLine"
                      className="size-4"
                    />
                  </Button>
                </ToolbarTooltip>
                <ToolbarTooltip label={t("editor.pdfViewer.rotateClockwise")}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editor.pdfViewer.rotateClockwise")}
                    disabled={controlsDisabled}
                    onClick={() => onRotate(1)}
                  >
                    <IconPlaceholder
                      lucide="RotateCw"
                      tabler="IconRotateClockwise"
                      hugeicons="RotateClockwiseIcon"
                      phosphor="ArrowClockwiseIcon"
                      remixicon="RiClockwiseLine"
                      className="size-4 -scale-x-100"
                    />
                  </Button>
                </ToolbarTooltip>
              </div>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
            </>
          ) : null}
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label={t("editor.pdfViewer.zoomOut")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pdfViewer.zoomOut")}
                disabled={
                  controlsDisabled || currentZoomLevel <= ZOOM_OPTIONS[0]
                }
                onClick={() => {
                  const nextZoom = [...ZOOM_OPTIONS]
                    .reverse()
                    .find((option) => option < currentZoomLevel);

                  onZoomChange(nextZoom ?? ZOOM_OPTIONS[0]);
                }}
              >
                <IconPlaceholder
                  lucide="CircleMinus"
                  tabler="IconCircleMinus"
                  hugeicons="MinusSignCircleIcon"
                  phosphor="MinusCircleIcon"
                  remixicon="RiIndeterminateCircleLine"
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
            <Select
              value={selectValue}
              onValueChange={(value) => {
                const next = String(value);
                onZoomChange(isZoomMode(next) ? next : Number(next));
              }}
              disabled={controlsDisabled}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className="w-[104px] min-w-[104px]"
                aria-label={t("editor.pdfViewer.zoomLevel")}
              >
                <SelectValue placeholder={t("editor.pdfViewer.zoom")}>
                  {Math.round(currentZoomLevel * 100)}%
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {(Object.keys(ZOOM_MODE_LABELS) as ZoomMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {ZOOM_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
                {zoomOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {Math.round(option * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarTooltip label={t("editor.pdfViewer.zoomIn")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pdfViewer.zoomIn")}
                disabled={
                  controlsDisabled ||
                  currentZoomLevel >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
                }
                onClick={() => {
                  const nextZoom = ZOOM_OPTIONS.find(
                    (option) => option > currentZoomLevel
                  );

                  onZoomChange(
                    nextZoom ?? ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
                  );
                }}
              >
                <IconPlaceholder
                  lucide="CirclePlusIcon"
                  tabler="IconCirclePlusFilled"
                  hugeicons="PlusSignCircleIcon"
                  phosphor="PlusCircleIcon"
                  remixicon="RiAddCircleFill"
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
          </div>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          {searchControl}
          {toolbarActions ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              {toolbarActions}
            </>
          ) : null}
          {showDownload || showUpload ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <PDFViewerFileActionsMenu
                downloadDisabled={downloadDisabled}
                isPreparingDownload={isPreparingDownload}
                onDownload={onDownload}
                onUploadFile={onUploadFile}
                showDownload={showDownload}
                showUpload={showUpload}
              />
            </>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  );
}