"use client";

import * as React from "react";
import {
  XlsxViewer,
  XlsxViewerProvider,
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerThumbnails,
  useXlsxViewerZoom,
  useXlsxViewerSelection,
  useXlsxViewerEditing,
  useXlsxViewerTables,
  useXlsxViewerImages,
  useXlsxViewerCharts,
  type XlsxViewerController,
  type XlsxSheetData,
  type XlsxSheetThumbnail,
  type XlsxWorkbookTab,
  type XlsxCellAddress,
  type XlsxCellRange,
  type XlsxImage,
  type XlsxChart,
  type XlsxTable,
  type XlsxFormControl,
  type XlsxChartLoadingRenderProps,
  type XlsxImageRenderProps,
  type XlsxImageSelectionRenderProps,
  type XlsxFormControlRenderProps,
  type XlsxScrollerRenderProps,
  type XlsxTableHeaderMenuRenderProps,
  type XlsxFileTooLargeRenderProps,
  type XlsxChartLoadingRenderProps,
  type XlsxImageSelectionRenderProps,
  type XlsxFormControlActionEvent,
  type XlsxFormControlChangeEvent,
  type XlsxFormControl,
  type XlsxChartElementSelection,
  type XlsxImageRect,
  type XlsxImageAnchor,
  type XlsxCellAddress,
  type XlsxCellRange,
  type XlsxChart,
  type XlsxTable,
  type XlsxFormControlInput,
  type XlsxFormControlPatch,
  type XlsxFormControlSelectionMode,
  type XlsxFormControlState,
  type XlsxFormulaTarget,
  type XlsxCellStyleInput,
  type XlsxCellStyleContext,
  type XlsxCellAddress,
  type XlsxCellRange,
  type XlsxCellAlignmentInput,
  type XlsxCellBorderStyleInput,
  type XlsxCellFillStyleInput,
  type XlsxCellFontStyleInput,
  type XlsxCellNumberFormatInput,
  type XlsxCellProtectionInput,
  type XlsxCellStyleColorInput,
  type XlsxCellStyleInput,
} from "@extend-ai/react-xlsx";
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
import { Tabs, TabsList, TabsTrigger } from "@openbitfun/ui";
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

const XLSX_LOADING_INDICATOR_DELAY_MS = 300;
const XLSX_DROPDOWN_Z_INDEX_CLASS = "z-40";
const XLSX_SEARCH_BATCH_ROW_COUNT = 500;
const XLSX_SEARCH_DEBOUNCE_MS = 300;
const XLSX_GRID_HEADER_HEIGHT = 24;
const XLSX_GRID_ROW_HEADER_WIDTH = 40;
const XLSX_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ZOOM_OPTIONS = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const;

const XLSX_SHEET_TAB_THUMBNAIL_OPTIONS = {
  resolution: {
    maxHeight: 360,
    maxWidth: 560,
  },
} as const;

type UploadedWorkbook = {
  buffer: ArrayBuffer;
  fileName: string;
  identity: string;
};

type XlsxSearchResult = {
  cell: XlsxCellAddress;
  displayValue: string;
  formula?: string;
  sheetIndex: number;
  sheetName: string;
  workbookSheetIndex: number;
};

function formatWorkbookName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName;

  const pathname = url.split("?")[0] ?? "";
  const rawName = pathname.split("/").pop() ?? "workbook.xlsx";

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function ensureWorkbookExtension(fileName: string) {
  const lowerFileName = fileName.toLowerCase();
  return lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls")
    ? fileName
    : `${fileName}.xlsx`;
}

function downloadWorkbookBuffer(buffer: ArrayBuffer, fileName: string) {
  const resolvedFileName = ensureWorkbookExtension(fileName);
  const blob = new Blob([buffer], {
    type: resolvedFileName.toLowerCase().endsWith(".xls")
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = resolvedFileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeSearchText(value: unknown) {
  return typeof value === "string"
    ? value
    : value === null || value === undefined
      ? ""
      : String(value);
}

function cellValueToSearchText(value: unknown) {
  if (!value || typeof value !== "object") return normalizeSearchText(value);

  const record = value as {
    asBoolean?: () => boolean | null;
    asError?: () => string | null;
    asNumber?: () => number | null;
    asText?: () => string | null;
    is_boolean?: boolean;
    is_empty?: boolean;
    is_error?: boolean;
    is_number?: boolean;
    is_text?: boolean;
  };

  if (record.is_empty) return "";
  if (record.is_error) return record.asError?.() ?? "";
  if (record.is_text) return record.asText?.() ?? "";
  if (record.is_number) return normalizeSearchText(record.asNumber?.());
  if (record.is_boolean) return record.asBoolean?.() ? "TRUE" : "FALSE";

  return normalizeSearchText(value);
}

function getCellSearchText(
  controller: XlsxViewerController,
  sheet: XlsxSheetData,
  row: number,
  col: number
) {
  const worksheet = controller.workbook?.getSheet(sheet.workbookSheetIndex);
  if (!worksheet) return { displayValue: "", formula: "" };

  const formula = worksheet.getFormulaAt(row, col) ?? "";
  const cachedFormulaValue = formula
    ? sheet.cachedFormulaValues[`${String.fromCharCode(65 + col)}${row + 1}`]
    : undefined;
  const formatted = worksheet.getFormattedValueAt(row, col);

  if (
    formatted &&
    !(formula && cachedFormulaValue !== undefined && formatted.startsWith("#"))
  ) {
    return { displayValue: formatted, formula };
  }

  const calculated = worksheet.getCalculatedValueAt(row, col);
  const displayValue =
    formula && cachedFormulaValue !== undefined && calculated.is_error
      ? cachedFormulaValue
      : cellValueToSearchText(calculated);

  return { displayValue, formula };
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

function isZoomMode(value: string): value is Exclude<number | "fit-page" | "fit-width" | "automatic", number> {
  return value === "fit-page" || value === "fit-width" || value === "automatic";
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

const XLSX_LOADING_INDICATOR_DELAY_MS_CONST = 300;
const XLSX_MAX_FILE_SIZE_BYTES_CONST = 50 * 1024 * 1024;
const ZOOM_OPTIONS_CONST = [10, 25, 50, 75, 100, 125, 150, 175, 200, 400] as const;
const XLSX_SHEET_TAB_THUMBNAIL_OPTIONS_CONST = {
  resolution: {
    maxHeight: 360,
    maxWidth: 560,
  },
} as const;

interface XlsxViewerProps {
  className?: string;
  defaultZoom?: number;
  fileName?: string;
  showDownload?: boolean;
  showToolbar?: boolean;
  showUpload?: boolean;
  src?: string;
  toolbarActions?: React.ReactNode;
  onDocumentLoadSuccess?: (numSheets: number) => void;
  onFileUpload?: (file: File) => void;
}

export function XlsxViewer({
  className,
  defaultZoom = 100,
  fileName,
  showDownload = true,
  showToolbar = true,
  showUpload = true,
  src,
  toolbarActions,
  onDocumentLoadSuccess,
  onFileUpload,
}: XlsxViewerProps) {
  const { t } = useI18n("tools");

  const controller = useXlsxViewerController({
    src,
    fileName,
    maxFileSizeBytes: XLSX_MAX_FILE_SIZE_BYTES_CONST,
    readOnly: false,
  });
  const { thumbnails } = useXlsxViewerThumbnails(controller, {
    includeHeaders: true,
    resolution: XLSX_SHEET_TAB_THUMBNAIL_OPTIONS_CONST.resolution,
  });

  const activePageStore = React.useMemo(
    () => {
      let activePage = 0;
      const listeners = new Set<() => void>();

      return {
        getSnapshot: () => activePage,
        setActivePage: (nextPage) => {
          const value =
            typeof nextPage === "function" ? nextPage(activePage) : nextPage;
          const normalizedValue = Math.max(0, Math.round(value || 0));

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
  const sidebarInline = false;
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [documentTheme, setDocumentTheme] = React.useState<"light" | "dark">(
    "light"
  );
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedWorkbook[]>(
    []
  );

  const showDelayedLoading = useDelayedLoadingIndicator(
    controller.isLoading,
    XLSX_LOADING_INDICATOR_DELAY_MS_CONST
  );

  const loadDocument = React.useCallback(async () => {
    if (!src || !controller) return;

    try {
      // The XlsxViewer handles loading internally via the controller
    } catch (error) {
      console.error("Failed to load XLSX:", error);
    }
  }, [src, controller]);

  React.useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleZoomChange = React.useCallback(
    (nextZoomState: number) => {
      setZoomLevel(nextZoomState);
      controller.setZoomScale(nextZoomState / 100);
    },
    [controller]
  );

  const handleZoomIn = React.useCallback(() => {
    const current = controller.zoomScale * 100;
    const next = getNextZoom(current, 1);
    setZoomLevel(next);
    controller.setZoomScale(next / 100);
  }, [controller]);

  const handleZoomOut = React.useCallback(() => {
    const current = controller.zoomScale * 100;
    const next = getNextZoom(current, -1);
    setZoomLevel(next);
    controller.setZoomScale(next / 100);
  }, [controller]);

  const selectZoom = React.useCallback(
    (value: string | number) => {
      const next = Number(value);
      setZoomLevel(next);
      controller.setZoomScale(next / 100);
    },
    [controller]
  );

  const handleDownload = React.useCallback(async () => {
    if (!src || !fileName) return;
    await controller.exportXlsx();
  }, [controller]);

  const handleUploadFile = React.useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const buffer = await file.arrayBuffer();
      setUploadedFiles((prev) => [
        ...prev,
        {
          buffer,
          fileName: file.name,
          identity: file.name,
        },
      ]);
      controller.exportXlsx(); // This won't work for upload - need to use file upload
    },
    [controller]
  );

  return (
    <div className={cn("flex h-full w-full flex-col bg-background", className)}>
      {showToolbar ? (
        <XlsxViewerToolbar
          activePage={activePage}
          controlsDisabled={controller.isLoading}
          currentZoomLevel={controller.zoomScale * 100}
          downloadDisabled={controller.isLoading}
          documentTheme={documentTheme}
          showDownload={showDownload}
          showUpload={showUpload}
          uploadedFiles={uploadedFiles}
          zoomLevel={zoomLevel}
          zoomOptions={ZOOM_OPTIONS_CONST}
          onZoomChange={handleZoomChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSelectZoom={selectZoom}
          onDownload={handleDownload}
          onUploadFile={handleUploadFile}
          onToggleTheme={() =>
            setDocumentTheme((prev) => (prev === "light" ? "dark" : "light"))
          }
        />
      ) : null}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {controller.isLoading && showDelayedLoading && (
          <div className="absolute inset-0 z-20 flex bg-muted/30">
            <div className="grid min-w-0 flex-1 place-items-center">
              <Spinner className="size-4" />
            </div>
          </div>
        )}
        <XlsxViewer
          ref={controller}
          controller={controller}
          className="h-full w-full"
          showDefaultToolbar={false}
          allowResizeInReadOnly={true}
          experimentalCanvas={true}
        />
        <XlsxThumbnailSidebar
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

function XlsxViewerToolbar({
  activePage,
  controlsDisabled,
  currentZoomLevel,
  downloadDisabled,
  documentTheme,
  showDownload,
  showUpload,
  uploadedFiles,
  zoomLevel,
  zoomOptions,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onSelectZoom,
  onDownload,
  onUploadFile,
  onToggleTheme,
}: {
  activePage: number;
  controlsDisabled: boolean;
  currentZoomLevel: number;
  downloadDisabled: boolean;
  documentTheme: "light" | "dark";
  showDownload: boolean;
  showUpload: boolean;
  uploadedFiles: UploadedWorkbook[];
  zoomLevel: number;
  zoomOptions: readonly number[];
  onZoomChange: (nextZoomState: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSelectZoom: (value: string | number) => void;
  onDownload: () => void;
  onUploadFile: (file: File) => void;
  onToggleTheme: () => void;
}) {
  const { t } = useI18n("tools");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectValue = String(Number(currentZoomLevel.toFixed(2)));

  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TooltipProvider>
          <ToolbarTooltip label={t("editor.xlsxViewer.pagesSidebar")}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("editor.xlsxViewer.pagesSidebar")}
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
        <XlsxPageNumberControl
          activePage={activePage + 1}
          controlsDisabled={controlsDisabled}
          numPages={0}
          onPageChange={() => {}}
        />
      </div>
      <TooltipProvider>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label={t("editor.xlsxViewer.zoomOut")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.xlsxViewer.zoomOut")}
                disabled={controlsDisabled || currentZoomLevel <= ZOOM_OPTIONS_CONST[0]}
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
                <SelectValue placeholder={t("editor.xlsxViewer.zoom")}>
                  {Math.round(currentZoomLevel * 100)}%
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {ZOOM_OPTIONS_CONST.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {Math.round(option * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarTooltip label={t("editor.xlsxViewer.zoomIn")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.xlsxViewer.zoomIn")}
                disabled={
                  controlsDisabled ||
                  currentZoomLevel >= ZOOM_OPTIONS_CONST[ZOOM_OPTIONS_CONST.length - 1]
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
            <ToolbarTooltip label={t("editor.xlsxViewer.toggleTheme")}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("editor.xlsxViewer.toggleTheme")}
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
              <XlsxViewerFileActionsMenu
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

function XlsxPageNumberControl({
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
      <span>{t("editor.xlsxViewer.sheet")}</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label={t("editor.xlsxViewer.currentSheet")}
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
          aria-label={`${t("editor.xlsxViewer.currentSheetLabel")} ${displayPage}. ${t("editor.xlsxViewer.editSheetNumber")}`}
          disabled={controlsDisabled || !numPages}
          onClick={() => {
            setDraftPage(String(displayPage));
            setIsEditing(true);
          }}
        >
          {displayPage}
        </Button>
      )}
      <span>{t("editor.xlsxViewer.of", { total: formatNumber(numPages) })}</span>
    </div>
  );
}

function XlsxViewerFileActionsMenu({
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
  uploadedFiles: UploadedWorkbook[];
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
          accept=".xls,.xlsx,.csv"
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
            aria-label={t("editor.xlsxViewer.openXlsxActions")}
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
              {t("editor.xlsxViewer.download")}
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
              {t("editor.xlsxViewer.upload")}
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
                    fileName={f.fileName}
                    mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

export function XlsxThumbnailSidebar({
  thumbnails,
  activePage,
  activePageStore,
  onActivePageChange,
  sidebarOpen,
  sidebarInline,
}: {
  thumbnails: XlsxSheetThumbnail[];
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
          pageIndex: t.sheetIndex,
          width: t.width,
          height: t.height,
          wrapperHeight: t.height + 24 + 8 * 2,
          top: t.sheetIndex * (t.height + 24 + 8 * 2 + 12) + 16,
          labelHeight: 24,
          padding: 8,
        }))}
        activePage={activePage + 1}
        pageCount={thumbnails.length}
        selectedPageIndexes={new Set([activePage])}
        onSelectPage={(sheetNumber) => onActivePageChange(sheetNumber - 1)}
      />
    </div>
  );
}

export default XlsxViewer;