"use client";

import * as React from "react";
import {
  DocxEditorViewer,
  useDocxComments,
  useDocxEditor,
  useDocxPageLayout,
  useDocxTrackChanges,
  useDocxViewerThumbnails,
  type DocxDocumentTheme,
  type DocxEditorController,
  type DocxPageThumbnailItem,
  type ViewerZoomLevel,
  type ViewerZoomState,
} from "@extend-ai/react-docx";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
import { Button } from "@openbitfun/ui";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_LOADING_INDICATOR_DELAY_MS = 300;
const DOCX_THUMBNAIL_WIDTH = 92;
const DOCX_THUMBNAIL_LIST_PADDING = 16;
const DOCX_THUMBNAIL_ROW_ESTIMATE = 172;
const DEFAULT_ZOOM = 50;
const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 175, 200] as const;
const ZOOM_MODE_LABELS = {
  "fit-page": "Fit page",
  "fit-width": "Fit width",
  automatic: "Automatic",
} satisfies Record<Exclude<ViewerZoomLevel, number>, string>;
const DOCX_PADDING_WARNING_TEXT = "a style property during rerender";
const DOCX_THUMBNAIL_FOCUS_RING_CLASS =
  "group-focus-visible/docx-thumbnail-sidebar:ring-2 group-focus-visible/docx-thumbnail-sidebar:ring-ring group-focus-visible/docx-thumbnail-sidebar:ring-offset-1 group-focus-visible/docx-thumbnail-sidebar:ring-offset-background";
const DOCX_THUMBNAIL_PREFETCH_ROWS = 4;

type UploadedDocxFile = {
  file: File;
  identity: string;
  sourceUrl: string | undefined;
};

type DocxActivePageStore = {
  getSnapshot: () => number;
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
  subscribe: (listener: () => void) => () => void;
};

type DocxThumbnailRenderWindowState = {
  visiblePageIndexes: number[];
  prefetchPageIndexes: number[];
};

function createDocxActivePageStore(): DocxActivePageStore {
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
}

function useDocxActivePage(activePageStore: DocxActivePageStore) {
  return React.useSyncExternalStore(
    activePageStore.subscribe,
    activePageStore.getSnapshot,
    activePageStore.getSnapshot
  );
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function loadDocxFile(
  url: string,
  displayFileName: string
): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DOCX (${response.status})`);
  }

  const blob = await response.blob();
  return new File([blob], displayFileName, {
    type: blob.type || DOCX_MIME_TYPE,
  });
}

function formatDocumentName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName;

  const pathname = url.split("?")[0] ?? "";
  const rawName = pathname.split("/").pop() ?? "document.docx";

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function ensureDocxExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".docx")
    ? fileName
    : `${fileName}.docx`;
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

async function downloadDocxFile({
  file,
  fileName,
  url,
}: {
  file?: File;
  fileName: string;
  url?: string;
}) {
  if (file) {
    downloadBlob(file, ensureDocxExtension(fileName));
    return;
  }

  if (!url) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download DOCX (${response.status})`);
  }

  downloadBlob(await response.blob(), ensureDocxExtension(fileName));
}

function getNextZoomScale(currentZoomScale: number, direction: 1 | -1) {
  if (direction > 0) {
    return (
      ZOOM_OPTIONS.find((value) => value > currentZoomScale) ??
        currentZoomScale
    );
  }

  for (let index = ZOOM_OPTIONS.length - 1; index >= 0; index -= 1) {
    const value = ZOOM_OPTIONS[index];
    if (value < currentZoomScale) return value;
  }

  return currentZoomScale;
}

function normalizeDocxZoomLevel(
  value: ViewerZoomLevel | undefined
): ViewerZoomLevel {
  return value ?? DEFAULT_ZOOM;
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

function isDocxPaddingWarning(args: unknown[]) {
  return (
    typeof args[0] === "string" &&
    args[0].includes(DOCX_PADDING_WARNING_TEXT) &&
    args.some((arg) => String(arg).includes("padding"))
  );
}

function useSuppressDocxPaddingWarning(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;

    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      if (isDocxPaddingWarning(args)) return;
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [enabled]);
}

function isInteractiveViewerTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'a[href], button, input, select, textarea, [contenteditable="true"], [role="button"], [role="link"]'
      )
    )
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

interface DocxViewerProps {
  className?: string;
  defaultZoom?: ViewerZoomLevel;
  fileName?: string;
  showDownload?: boolean;
  showToolbar?: boolean;
  showUpload?: boolean;
  src?: string;
  toolbarActions?: React.ReactNode;
  onDocumentLoadSuccess?: (numPages: number) => void;
  onPdfUpload?: (file: File) => void;
}

export function DocxViewer({
  className,
  defaultZoom = DEFAULT_ZOOM,
  fileName,
  showDownload = true,
  showToolbar = true,
  showUpload = true,
  src,
  toolbarActions,
  onDocumentLoadSuccess,
  onPdfUpload,
}: DocxViewerProps) {
  const { t } = useI18n("tools");

  const editor = useDocxEditor();
  const { layout } = useDocxPageLayout(editor);
  const { provides: trackChanges } = useDocxTrackChanges(editor);
  const { provides: comments } = useDocxComments(editor);
  const { thumbnails } = useDocxViewerThumbnails(editor, {
    resolution: {
      maxHeight: 360,
      maxWidth: 560,
    },
  });

  const activePageStore = React.useMemo(
    () => createDocxActivePageStore(),
    []
  );
  const activePage = useDocxActivePage(activePageStore);
  const sidebarOpen = React.useRef(true);
  const sidebarInline = useInlineThumbnailSidebar();
  const sidebarWidth = useElementWidth();
  const showDelayedLoading = useDelayedLoadingIndicator(
    editor.isImporting,
    DOCX_LOADING_INDICATOR_DELAY_MS
  );
  const [zoomLevel, setZoomLevel] = React.useState<ViewerZoomLevel>(
    normalizeDocxZoomLevel(defaultZoom)
  );
  const [zoomState, setZoomState] = React.useState<ViewerZoomState>({
    level: normalizeDocxZoomLevel(defaultZoom),
    resolvedZoom: 50,
  });
  const [showTrackedChanges, setShowTrackedChanges] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [documentTheme, setDocumentTheme] = React.useState<DocxDocumentTheme>(
    "light"
  );
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedDocxFile[]>(
    []
  );

  useSuppressDocxPaddingWarning(true);

  const loadDocument = React.useCallback(async () => {
    if (!src) return;

    try {
      const file = await loadDocxFile(src, formatDocumentName(fileName, src));
      setUploadedFiles([
        {
          file,
          identity: file.name,
          sourceUrl: src,
        },
      ]);
      await editor.importDocxFile(file);
      onDocumentLoadSuccess?.(editor.totalPages);
    } catch (error) {
      console.error("Failed to load DOCX:", error);
    }
  }, [src, fileName, editor, onDocumentLoadSuccess]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  React.useEffect(() => {
    const subscription = trackChanges?.onChange(() => {
      // Track changes state is reactive through the editor
    });
    return () => subscription?.();
  }, [trackChanges]);

  React.useEffect(() => {
    const subscription = comments?.onChange(() => {
      // Comments state is reactive through the editor
    });
    return () => subscription?.();
  }, [comments]);

  const handleZoomChange = React.useCallback(
    (nextZoomState: ViewerZoomState) => {
      setZoomLevel(nextZoomState.level);
      setZoomState(nextZoomState);
    },
    []
  );

  const handleZoomIn = React.useCallback(() => {
    const current = zoomState.resolvedZoom;
    const next = getNextZoomScale(current, 1);
    setZoomLevel(next);
  }, [zoomState.resolvedZoom]);

  const handleZoomOut = React.useCallback(() => {
    const current = zoomState.resolvedZoom;
    const next = getNextZoomScale(current, -1);
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
    await downloadDocxFile({
      url: src,
      fileName: ensureDocxExtension(fileName),
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
      editor.importDocxFile(file);
    },
    [editor]
  );

  const trackedChangeCardRenderer = React.useMemo(
    () => createDocxTrackedChangeCardRenderer(trackChanges),
    [trackChanges]
  );
  const commentCardRenderer = React.useMemo(
    () => createDocxCommentCardRenderer(comments),
    [comments]
  );

  return (
    <div className={cn("flex h-full w-full flex-col bg-background", className)}>
      {showToolbar ? (
        <DocxViewerToolbar
          activePage={activePage}
          controlsDisabled={editor.isImporting}
          currentZoomLevel={zoomState.resolvedZoom}
          downloadDisabled={editor.isImporting}
          documentTheme={documentTheme}
          layout={layout}
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
          onToggleTrackedChanges={() => setShowTrackedChanges((prev) => !prev)}
          onToggleComments={() => setShowComments((prev) => !prev)}
          onToggleTheme={() =>
            setDocumentTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
          showTrackedChanges={showTrackedChanges}
          showComments={showComments}
          trackChanges={trackChanges}
          comments={comments}
          editor={editor}
        />
      ) : null}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {editor.isImporting && showDelayedLoading && (
          <div className="absolute inset-0 z-20 flex bg-muted/30">
            <div className="grid min-w-0 flex-1 place-items-center">
              <Spinner className="size-4" />
            </div>
          </div>
        )}
        <DocxEditorViewer
          editor={editor}
          className="h-full w-full"
          mode="read-only"
          zoom={zoomLevel}
          onZoomChange={handleZoomChange}
          showTrackedChanges={showTrackedChanges}
          showComments={showComments}
          renderTrackedChangeCard={trackedChangeCardRenderer}
          renderCommentCard={commentCardRenderer}
          pageVirtualization={{
            enabled: true,
            overscan: 1,
          }}
        />
        <DocxThumbnailSidebar
          thumbnails={thumbnails}
          activePage={activePage}
          activePageStore={activePageStore}
          onActivePageChange={activePageStore.setActivePage}
          sidebarOpen={sidebarOpen.current}
          sidebarInline={sidebarInline}
        />
      </div>
    </div>
  );
}

function DocxViewerToolbar({
  activePage,
  controlsDisabled,
  currentZoomLevel,
  downloadDisabled,
  documentTheme,
  layout,
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
  onToggleTrackedChanges,
  onToggleComments,
  onToggleTheme,
  showTrackedChanges,
  showComments,
  trackChanges,
  comments,
  editor,
}: {
  activePage: number;
  controlsDisabled: boolean;
  currentZoomLevel: number;
  downloadDisabled: boolean;
  documentTheme: DocxDocumentTheme;
  layout: ReturnType<typeof useDocxPageLayout>["layout"];
  showDownload: boolean;
  showUpload: boolean;
  uploadedFiles: UploadedDocxFile[];
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
  onToggleTrackedChanges: () => void;
  onToggleComments: () => void;
  onToggleTheme: () => void;
  showTrackedChanges: boolean;
  showComments: boolean;
  trackChanges: ReturnType<typeof useDocxTrackChanges>["provides"];
  comments: ReturnType<typeof useDocxComments>["provides"];
  editor: DocxEditorController;
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
          <ToolbarTooltip label={t("editor.docxViewer.pagesSidebar")}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("editor.docxViewer.pagesSidebar")}
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
        <DocxPageNumberControl
          activePage={activePage}
          controlsDisabled={controlsDisabled}
          numPages={editor.totalPages}
          onPageChange={(page) => editor.setPage(page)}
        />
      </div>
      <TooltipProvider>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label={t("editor.docxViewer.zoomOut")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.docxViewer.zoomOut")}
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
                <SelectValue placeholder={t("editor.docxViewer.zoom")}>
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
            <ToolbarTooltip label={t("editor.docxViewer.zoomIn")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.docxViewer.zoomIn")}
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
            <ToolbarTooltip label={t("editor.docxViewer.toggleTrackedChanges")}>
              <Button
                type="button"
                variant={showTrackedChanges ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={t("editor.docxViewer.toggleTrackedChanges")}
                aria-pressed={showTrackedChanges}
                onClick={onToggleTrackedChanges}
              >
                <IconPlaceholder
                  lucide="GitCompare"
                  tabler="IconGitCompare"
                  hugeicons="GitCompareIcon"
                  phosphor="GitCompareIcon"
                  remixicon="RiGitCompareLine"
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label={t("editor.docxViewer.toggleComments")}>
              <Button
                type="button"
                variant={showComments ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={t("editor.docxViewer.toggleComments")}
                aria-pressed={showComments}
                onClick={onToggleComments}
              >
                <IconPlaceholder
                  lucide="MessageSquareText"
                  tabler="IconMessageSquareText"
                  hugeicons="MessageSquareTextIcon"
                  phosphor="MessageSquareTextIcon"
                  remixicon="RiMessageSquareTextLine"
                  className="size-4"
                />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label={t("editor.docxViewer.toggleTheme")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.docxViewer.toggleTheme")}
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
              <DocxViewerFileActionsMenu
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

function DocxPageNumberControl({
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
      <span>{t("editor.docxViewer.page")}</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label={t("editor.docxViewer.currentPage")}
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
          aria-label={`${t("editor.docxViewer.currentPageLabel")} ${displayPage}. ${t("editor.docxViewer.editPageNumber")}`}
          disabled={controlsDisabled || !numPages}
          onClick={() => {
            setDraftPage(String(displayPage));
            setIsEditing(true);
          }}
        >
          {displayPage}
        </Button>
      )}
      <span>{t("editor.docxViewer.of", { total: formatNumber(numPages) })}</span>
    </div>
  );
}

function DocxViewerFileActionsMenu({
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
  uploadedFiles: UploadedDocxFile[];
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
          accept=".doc,.docx"
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
            aria-label={t("editor.docxViewer.openDocxActions")}
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
              {t("editor.docxViewer.download")}
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
              {t("editor.docxViewer.upload")}
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
                    mimeType={f.file.type || DOCX_MIME_TYPE}
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

export function DocxThumbnailSidebar({
  thumbnails,
  activePage,
  activePageStore,
  onActivePageChange,
  sidebarOpen,
  sidebarInline,
}: {
  thumbnails: ReturnType<typeof useDocxViewerThumbnails>["thumbnails"];
  activePage: number;
  activePageStore: DocxActivePageStore;
  onActivePageChange: DocxActivePageStore["setActivePage"];
  sidebarOpen: boolean;
  sidebarInline: boolean;
}) {
  if (!sidebarOpen) return null;

  return (
    <div className="hidden lg:block w-40 flex-shrink-0 border-l bg-background">
      <DocumentViewerThumbnailSidebar
        thumbnails={thumbnails.map((t) => ({
          pageIndex: t.pageIndex,
          width: t.widthPx,
          height: t.heightPx,
          wrapperHeight: t.heightPx + 24 + 8 * 2,
          top: t.pageIndex * (t.heightPx + 24 + 8 * 2 + 12) + 16,
          labelHeight: 24,
          padding: 8,
        }))}
        activePage={activePage}
        pageCount={thumbnails.length}
        selectedPageIndexes={new Set([activePage - 1])}
        onSelectPage={(pageNumber) => onActivePageChange(pageNumber)}
      />
    </div>
  );
}

export default DocxViewer;