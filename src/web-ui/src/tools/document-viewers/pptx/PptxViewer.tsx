"use client";

import * as React from "react";
import {
  ReactPptxViewer,
  usePptxViewer,
  usePptxViewerThumbnails,
  type ParsedPresentation,
  type PresentationSlide,
  type PptxSlideThumbnailItem,
  type ViewerZoomLevel,
  type ViewerZoomState,
  type PptxViewerController,
  type PptxSlideThumbnailRenderWindow,
  type PresentationSource,
} from "@extend-ai/react-pptx";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
import { Button } from "@openbitfun/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openbitfun/ui";
import { Input } from "@openbitfun/ui";
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
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/tools/document-viewers/shared/document-viewer-sidebar";
import { FileThumbnail } from "@/tools/document-viewers/shared/file-thumbnail";
import { IconPlaceholder } from "@/components/icon-placeholder";
import { useI18n } from "@/infrastructure/i18n";

import "@extend-ai/react-pptx/styles.css";

const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const PPT_MIME_TYPE = "application/vnd.ms-powerpoint";
const DEFAULT_ZOOM = 100;
const PPTX_LOADING_INDICATOR_DELAY_MS = 300;
const PPTX_THUMBNAIL_WIDTH = 112;
const PPTX_THUMBNAIL_LIST_PADDING = 12;
const PPTX_THUMBNAIL_ROW_ESTIMATE = 112;
const PPTX_THUMBNAIL_PREFETCH_ROWS = 0;
const PPTX_THUMBNAIL_FOLLOW_DELAY_MS = 250;
const PPTX_SCROLL_TOP_EPSILON_PX = 24;
const PPTX_INSTANT_NAVIGATION_TIMEOUT_MS = 250;
const PPTX_SMOOTH_NAVIGATION_TIMEOUT_MS = 1_000;
const ZOOM_OPTIONS = [25, 50, 75, 100, 125, 150, 175, 200, 300, 400] as const;
const ZOOM_MODE_LABELS = {
  "fit-page": "Fit page",
  "fit-width": "Fit width",
  automatic: "Automatic",
} satisfies Record<Exclude<ViewerZoomLevel, number>, string>;
const PPTX_THUMBNAIL_FOCUS_RING_CLASS =
  "group-focus-visible/pptx-thumbnail-sidebar:ring-2 group-focus-visible/pptx-thumbnail-sidebar:ring-ring group-focus-visible/pptx-thumbnail-sidebar:ring-offset-1 group-focus-visible/pptx-thumbnail-sidebar:ring-offset-background";

type UploadedPresentation = {
  file: File;
  identity: string;
  sourceUrl: string | undefined;
};

function areNumberArraysEqual(
  left: readonly number[],
  right: readonly number[]
) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function formatPresentationName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName;

  const pathname = url.split("?")[0] ?? "";
  const rawName = pathname.split("/").pop() ?? "presentation.pptx";

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function ensurePresentationExtension(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.endsWith(".pptx") || lowerFileName.endsWith(".ppt")
    ? fileName
    : `${fileName}.pptx`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function downloadPresentation({
  file,
  fileName,
  url,
}: {
  file?: File;
  fileName: string;
  url?: string;
}) {
  if (file) {
    downloadBlob(file, ensurePresentationExtension(fileName));
    return;
  }

  if (!url) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download presentation (${response.status})`);
  }

  downloadBlob(await response.blob(), ensurePresentationExtension(fileName));
}

function getNextZoom(currentZoom: number, direction: 1 | -1) {
  if (direction > 0) {
    return ZOOM_OPTIONS.find((value) => value > currentZoom) ?? currentZoom;
  }

  for (let index = ZOOM_OPTIONS.length - 1; index >= 0; index -= 1) {
    const value = ZOOM_OPTIONS[index];
    if (value < currentZoom) return value;
  }

  return currentZoom;
}

function isZoomMode(value: string): value is Exclude<ViewerZoomLevel, number> {
  return value in ZOOM_MODE_LABELS;
}

function useDelayedLoadingIndicator(isLoading: boolean, delayMs: number) {
  const [showSpinner, setShowSpinner] = React.useState(false);
  const [previousIsLoading, setPreviousIsLoading] = React.useState(isLoading);

  if (previousIsLoading !== isLoading) {
    setPreviousIsLoading(isLoading);
    setShowSpinner(false);
  }

  React.useEffect(() => {
    if (!isLoading) return;

    const timeoutId = window.setTimeout(() => {
      setShowSpinner(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, isLoading]);

  return isLoading && showSpinner;
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

interface PptxViewerProps {
  className?: string;
  defaultZoom?: ViewerZoomLevel;
  fileName?: string;
  showDownload?: boolean;
  showToolbar?: boolean;
  showUpload?: boolean;
  src?: string;
  toolbarActions?: React.ReactNode;
  onDocumentLoadSuccess?: (numSlides: number) => void;
  onFileUpload?: (file: File) => void;
}

export function PptxViewer({
  className,
  defaultZoom = DEFAULT_ZOOM,
  fileName,
  showDownload = true,
  showToolbar = true,
  showUpload = true,
  src,
  toolbarActions,
  onDocumentLoadSuccess,
  onFileUpload,
}: PptxViewerProps) {
  const { t } = useI18n("tools");

  const { controller, ref } = usePptxViewer();
  const { thumbnails } = usePptxViewerThumbnails(controller, {
    resolution: {
      maxHeight: 360,
      maxWidth: 560,
    },
  });

  const activePageStore = React.useMemo(
    () => {
      let activePage = 1;
      const listeners = new Set<() => void>();

      return {
        getSnapshot: () => activePage,
        setActivePage: (nextPage) => {
          const value =
            typeof nextPage === "function" ? nextPage(activePage) : nextPage;
          const normalizedValue = Math.max(1, Math.round(value || 1));

          if (normalizedValue === activePage) return;

          activePage = normalizedValue;
          listeners.forEach((listener) => listener());
        },
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    },
    []
  );

  const activePage = React.useSyncExternalStore(
    activePageStore.subscribe,
    activePageStore.getSnapshot,
    activePageStore.getSnapshot
  );

  const sidebarOpen = React.useRef(true);
  const sidebarInline = useInlineThumbnailSidebar();
  const sidebarWidth = useElementWidth();
  const [zoomLevel, setZoomLevel] = React.useState<ViewerZoomLevel>(
    defaultZoom
  );
  const [zoomState, setZoomState] = React.useState<ViewerZoomState>({
    level: defaultZoom,
    resolvedZoom: 100,
  });
  const [documentTheme, setDocumentTheme] = React.useState<"light" | "dark">(
    "light"
  );
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedPresentation[]>(
    []
  );

  const showDelayedLoading = useDelayedLoadingIndicator(
    true,
    PPTX_LOADING_INDICATOR_DELAY_MS
  );

  const loadDocument = React.useCallback(async () => {
    if (!src || !controller) return;

    try {
      // The ReactPptxViewer handles loading internally
      // We just need to track the source
    } catch (error) {
      console.error("Failed to load PPTX:", error);
    }
  }, [src, controller]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleZoomChange = React.useCallback(
    (nextZoomState: ViewerZoomState) => {
      setZoomLevel(nextZoomState.level);
      setZoomState(nextZoomState);
    },
    []
  );

  const handleZoomIn = React.useCallback(() => {
    const current = zoomState.resolvedZoom;
    const next = getNextZoom(current, 1);
    setZoomLevel(next);
  }, [zoomState.resolvedZoom]);

  const handleZoomOut = React.useCallback(() => {
    const current = zoomState.resolvedZoom;
    const next = getNextZoom(current, -1);
    setZoomLevel(next);
  }, [zoomState.resolvedZoom]);

  const selectZoom = React.useCallback(
    (value: string | number) => {
      const next = isZoomMode(String(value))
        ? (String(value) as Exclude<ViewerZoomLevel, number>)
        : Number(value);
      setZoomLevel(next);
    },
    []
  );

  const handleDownload = React.useCallback(async () => {
    if (!src || !fileName) return;
    await downloadPresentation({
      url: src,
      fileName: ensurePresentationExtension(fileName),
    });
  }, [src, fileName]);

  const handleUploadFile = React.useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setUploadedFiles((prev) => [
        ...prev,
        {
          file,
          identity: file.name,
          sourceUrl: url,
        },
      ]);
    },
    []
  );

  const presentationSource: PresentationSource = src
    ? src
    : uploadedFiles[0]?.file
      ? uploadedFiles[0].file
      : null;

  return (
    <div className={cn("flex h-full w-full flex-col bg-background", className)}>
      {showToolbar ? (
        <PptxViewerToolbar
          activePage={activePage}
          controlsDisabled={!presentationSource}
          currentZoomLevel={zoomState.resolvedZoom}
          downloadDisabled={!presentationSource}
          documentTheme={documentTheme}
          showDownload={showDownload}
          showUpload={showUpload}
          uploadedFiles={uploadedFiles}
          zoomLevel={zoomLevel}
          zoomModeLabels={ZOOM_MODE_LABELS}
          zoomOptions={ZOOM_OPTIONS}
          zoomState={zoomState}
          onZoomChange={handleZoomChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSelectZoom={selectZoom}
          onDownload={handleDownload}
          onUploadFile={handleUploadFile}
          onToggleTheme={() =>
            setDocumentTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
          showTrackedChanges={false}
          showComments={false}
        />
      ) : null}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {presentationSource && (
          <>
            {showDelayedLoading && (
              <div className="absolute inset-0 z-20 flex bg-muted/30">
                <div className="grid min-w-0 flex-1 place-items-center">
                  <Spinner className="size-4" />
                </div>
              </div>
            )}
            <ReactPptxViewer
              ref={ref}
              source={presentationSource}
              mode="slide"
              slideIndex={activePage - 1}
              onSlideChange={(index) => activePageStore.setActivePage(index + 1)}
              zoom={zoomLevel}
              onZoomChange={handleZoomChange}
              showToolbar={false}
              showThumbnails={false}
              showNotes={false}
              className="h-full w-full"
              parseOptions={{
                maxInputBytes: 200 * 1024 * 1024,
              }}
            />
            <PptxThumbnailSidebar
              thumbnails={thumbnails}
              activePage={activePage}
              activePageStore={activePageStore}
              onActivePageChange={activePageStore.setActivePage}
              sidebarOpen={sidebarOpen.current}
              sidebarInline={sidebarInline}
            />
          </>
        )}
        {!presentationSource && (
          <div className="flex flex-1 items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-2">{t("editor.pptxViewer.title")}</p>
              <p>{t("editor.pptxViewer.noDocument")}</p>
              <p className="text-sm mt-1">{t("editor.pptxViewer.selectDocument")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PptxViewerToolbar({
  activePage,
  controlsDisabled,
  currentZoomLevel,
  downloadDisabled,
  documentTheme,
  showDownload,
  showUpload,
  uploadedFiles,
  zoomLevel,
  zoomModeLabels,
  zoomOptions,
  zoomState,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onSelectZoom,
  onDownload,
  onUploadFile,
  onToggleTheme,
  showTrackedChanges,
  showComments,
}: {
  activePage: number;
  controlsDisabled: boolean;
  currentZoomLevel: number;
  downloadDisabled: boolean;
  documentTheme: "light" | "dark";
  showDownload: boolean;
  showUpload: boolean;
  uploadedFiles: UploadedPresentation[];
  zoomLevel: ViewerZoomLevel;
  zoomModeLabels: Record<Exclude<ViewerZoomLevel, number>, string>;
  zoomOptions: readonly number[];
  zoomState: ViewerZoomState;
  onZoomChange: (nextZoomState: ViewerZoomState) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSelectZoom: (value: string | number) => void;
  onDownload: () => void;
  onUploadFile: (file: File) => void;
  onToggleTheme: () => void;
  showTrackedChanges: boolean;
  showComments: boolean;
}) {
  const { t } = useI18n("tools");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectValue = isZoomMode(zoomLevel)
    ? zoomLevel
    : String(Number(currentZoomLevel.toFixed(2)));

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TooltipProvider>
          <ToolbarTooltip label={t("editor.pptxViewer.pagesSidebar")}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("editor.pptxViewer.pagesSidebar")}
              aria-pressed={true}
              data-active=""
              className="bg-accent text-accent-foreground ring-1 ring-ring/40 ring-inset"
              disabled={controlsDisabled}
              onClick={() => {}}
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
        <PptxPageNumberControl
          activePage={activePage}
          controlsDisabled={controlsDisabled}
          numPages={0}
          onPageChange={() => {}}
        />
      </div>
      <TooltipProvider>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label={t("editor.pptxViewer.zoomOut")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pptxViewer.zoomOut")}
                disabled={controlsDisabled || currentZoomLevel <= zoomOptions[0]}
                onClick={onZoomOut}
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
              onValueChange={onSelectZoom}
              disabled={controlsDisabled}
              modal={false}
            >
              <SelectTrigger size="sm" className="w-[104px] min-w-[104px]">
                <SelectValue placeholder={t("editor.pptxViewer.zoom")}>
                  {Math.round(currentZoomLevel * 100)}%
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {(Object.keys(zoomModeLabels) as Array<keyof typeof zoomModeLabels>).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {zoomModeLabels[mode]}
                  </SelectItem>
                ))}
                {zoomOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {Math.round(option * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarTooltip label={t("editor.pptxViewer.zoomIn")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pptxViewer.zoomIn")}
                disabled={
                  controlsDisabled ||
                  currentZoomLevel >= zoomOptions[zoomOptions.length - 1]
                }
                onClick={onZoomIn}
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
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label={t("editor.pptxViewer.toggleTheme")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.pptxViewer.toggleTheme")}
                onClick={onToggleTheme}
              >
                {documentTheme === "light" ? (
                  <IconPlaceholder
                    lucide="Moon"
                    tabler="IconMoon"
                    hugeicons="MoonIcon"
                    phosphor="MoonIcon"
                    remixicon="RiMoonLine"
                    className="size-4"
                  />
                ) : (
                  <IconPlaceholder
                    lucide="Sun"
                    tabler="IconSun"
                    hugeicons="SunIcon"
                    phosphor="SunIcon"
                    remixicon="RiSunLine"
                    className="size-4"
                  />
                )}
              </Button>
            </ToolbarTooltip>
          </div>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          {showDownload || showUpload ? (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
              <PptxViewerFileActionsMenu
                downloadDisabled={downloadDisabled}
                onDownload={onDownload}
                onUploadFile={onUploadFile}
                showDownload={showDownload}
                showUpload={showUpload}
                uploadedFiles={uploadedFiles}
              />
            </>
          ) : null}
        </div>
      </TooltipProvider>
    </div>
  );
}

function PptxPageNumberControl({
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
      <span>{t("editor.pptxViewer.slide")}</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label={t("editor.pptxViewer.currentSlide")}
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
          aria-label={`${t("editor.pptxViewer.currentSlideLabel")} ${displayPage}. ${t("editor.pptxViewer.editSlideNumber")}`}
          disabled={controlsDisabled || !numPages}
          onClick={() => {
            setDraftPage(String(displayPage));
            setIsEditing(true);
          }}
        >
          {displayPage}
        </Button>
      )}
      <span>{t("editor.pptxViewer.of", { total: formatNumber(numPages) })}</span>
    </div>
  );
}

function PptxViewerFileActionsMenu({
  downloadDisabled,
  onDownload,
  onUploadFile,
  showDownload = false,
  showUpload = false,
  uploadedFiles,
}: {
  downloadDisabled?: boolean;
  onDownload?: () => void;
  onUploadFile?: (file: File) => void;
  showDownload?: boolean;
  showUpload?: boolean;
  uploadedFiles: UploadedPresentation[];
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
          accept=".ppt,.pptx"
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
            aria-label={t("editor.pptxViewer.openPptxActions")}
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
              <IconPlaceholder
                lucide="Download"
                tabler="IconDownload"
                hugeicons="Download01Icon"
                phosphor="DownloadSimpleIcon"
                remixicon="RiDownload2Line"
                className="size-4"
              />
              {t("editor.pptxViewer.download")}
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
              {t("editor.pptxViewer.upload")}
            </DropdownMenuItem>
          ) : null}
          {uploadedFiles.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {uploadedFiles.map((f) => (
                <DropdownMenuItem
                  key={f.identity}
                  onClick={() => {
                    // Switch to this file
                  }}
                >
                  <FileThumbnail
                    fileName={f.file.name}
                    mimeType={f.file.type || PPTX_MIME_TYPE}
                    size="sm"
                    showName={true}
                  />
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function PptxThumbnailSidebar({
  thumbnails,
  activePage,
  activePageStore,
  onActivePageChange,
  sidebarOpen,
  sidebarInline,
}: {
  thumbnails: PptxSlideThumbnailItem[];
  activePage: number;
  activePageStore: {
    getSnapshot: () => number;
    setActivePage: (page: number) => void;
    subscribe: (listener: () => void) => () => void;
  };
  onActivePageChange: (page: number) => void;
  sidebarOpen: boolean;
  sidebarInline: boolean;
}) {
  if (!sidebarOpen) return null;

  return (
    <div className="hidden lg:block w-40 flex-shrink-0 border-l bg-background">
      <DocumentViewerThumbnailSidebar
        thumbnails={thumbnails.map((t) => ({
          pageIndex: t.slideIndex,
          width: t.width,
          height: t.height,
          wrapperHeight: t.height + 24 + 8 * 2,
          top: t.slideIndex * (t.height + 24 + 8 * 2 + 12) + 16,
          labelHeight: 24,
          padding: 8,
        }))}
        activePage={activePage}
        pageCount={thumbnails.length}
        selectedPageIndexes={new Set([activePage - 1])}
        onSelectPage={(slideNumber) => onActivePageChange(slideNumber)}
      />
    </div>
  );
}

export default PptxViewer;