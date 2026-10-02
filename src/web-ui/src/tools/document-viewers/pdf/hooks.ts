"use client";

import * as React from "react";
import { useRegistry } from "@embedpdf/core/react";
import {
  useActiveDocument,
  useDocumentManagerCapability,
} from "@embedpdf/plugin-document-manager/react";
import {
  useScroll,
  useScrollPlugin,
  type PageLayout,
  type ScrollerLayout,
  type VirtualItem,
} from "@embedpdf/plugin-scroll/react";
import {
  useSearch,
} from "@embedpdf/plugin-search/react";
import {
  useSelectionCapability,
  useSelectionPlugin,
} from "@embedpdf/plugin-selection/react";
import {
  useThumbnailCapability,
  useThumbnailPlugin,
  type ThumbMeta,
} from "@embedpdf/plugin-thumbnail/react";
import {
  useIsViewportGated,
  useViewportCapability,
  useViewportElement,
  useViewportRef,
  ViewportElementContext,
} from "@embedpdf/plugin-viewport/react";
import {
  useZoom,
  ZoomMode,
} from "@embedpdf/plugin-zoom/react";
import { flushSync } from "react-dom";

import type { PdfDocumentObject, PdfEngine, Rect, Rotation } from "@embedpdf/models";

import { loadSharedPdfEngine } from "@/lib/pdf-thumbnail-utils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const DEFAULT_ZOOM = 1;
export const ZOOM_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
export const PAGE_GAP = 24;
export const THUMBNAIL_PAGE_WIDTH = 92;
export const THUMBNAIL_IMAGE_PADDING = 8;
export const THUMBNAIL_WIDTH = THUMBNAIL_PAGE_WIDTH + THUMBNAIL_IMAGE_PADDING * 2;
export const THUMBNAIL_LABEL_HEIGHT = 24;
export const THUMBNAIL_GAP = 12;
export const THUMBNAIL_PANE_PADDING_Y = 16;
export const THUMBNAIL_SIDEBAR_WIDTH_CLASS = "w-40";
export const THUMBNAIL_SIDEBAR_CLOSED_CLASS = "-ml-40";
export const PAGE_BASE_RENDER_MAX_SCALE = 1;
export const PAGE_BASE_RENDER_DPR = 1;
export const PDF_SEARCH_DEBOUNCE_MS = 300;
export const TEXT_SELECTION_BACKGROUND = "rgba(59, 130, 246, 0.14)";
export const THUMBNAIL_FOCUS_RING_CLASS =
  "group-focus-visible/pdf-thumbnail-sidebar:ring-2 group-focus-visible/pdf-thumbnail-sidebar:ring-ring group-focus-visible/pdf-thumbnail-sidebar:ring-offset-1 group-focus-visible/pdf-thumbnail-sidebar:ring-offset-background";
export const DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR =
  '[data-slot="scroll-area-viewport"]';

export const ZOOM_MODE_LABELS: Record<ZoomMode, string> = {
  [ZoomMode.FitPage]: "Fit page",
  [ZoomMode.FitWidth]: "Fit width",
  [ZoomMode.Automatic]: "Automatic",
};

export function toZoomLevel(level: number | "fit-page" | "fit-width" | "automatic"): ZoomMode | number {
  if (level === "fit-page") return ZoomMode.FitPage;
  if (level === "fit-width") return ZoomMode.FitWidth;
  if (level === "automatic") return ZoomMode.Automatic;
  return level;
}

export function isZoomMode(value: unknown): value is ZoomMode {
  return (
    value === ZoomMode.FitPage ||
    value === ZoomMode.FitWidth ||
    value === ZoomMode.Automatic
  );
}

export function resolveDefaultScrollAreaViewport(container: HTMLDivElement) {
  return container.querySelector<HTMLDivElement>(
    DEFAULT_SCROLL_AREA_VIEWPORT_SELECTOR
  );
}

export const PDFViewerScrollAreaResolverContext =
  React.createContext<ReturnType<typeof resolveDefaultScrollAreaViewport>>(
    resolveDefaultScrollAreaViewport
  );

export type PageRotationDeltas = Map<number, Rotation>;
export type ThumbnailSelectionMode = "replace" | "toggle" | "range";

export function getPageIndexRange(from: number, to: number): Set<number> {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const range = new Set<number>();

  for (let pageIndex = start; pageIndex <= end; pageIndex += 1) {
    range.add(pageIndex);
  }

  return range;
}

export function arePageIndexSetsEqual(left: Set<number>, right: Set<number>) {
  if (left.size !== right.size) return false;

  for (const value of left) {
    if (!right.has(value)) return false;
  }

  return true;
}

export function normalizeRotation(rotation: number): Rotation {
  return (((rotation % 4) + 4) % 4) as Rotation;
}

export function useSharedPdfEngine() {
  const [engine, setEngine] = React.useState<PdfEngine | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    loadSharedPdfEngine().then(
      (loadedEngine) => {
        if (!cancelled) setEngine(loadedEngine);
      },
      (loadError: Error) => {
        if (!cancelled) setError(loadError);
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return { engine, error };
}

export function rotationToDegrees(rotation: Rotation) {
  return (rotation as number) * 90;
}

export function normalizeDegrees(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

export function ensurePdfExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
}

export function getPdfDownloadFileName(fileName: string | undefined, src: string) {
  if (fileName?.trim()) return ensurePdfExtension(fileName.trim());

  const pathname = src.split(/[?#]/)[0] ?? "";
  const rawName = pathname.split("/").pop() || "document.pdf";

  try {
    return ensurePdfExtension(decodeURIComponent(rawName));
  } catch {
    return ensurePdfExtension(rawName);
  }
}

export function getRotatedPdfDownloadFileName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "-rotated.pdf");
}

export function downloadBlob(blob: Blob, fileName: string) {
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

export async function downloadPdfWithPageRotations({
  fileName,
  pageRotationDeltas,
  src,
}: {
  fileName: string;
  pageRotationDeltas: PageRotationDeltas;
  src: string;
}) {
  const response = await fetch(src);

  if (!response.ok) {
    throw new Error(`Failed to download PDF (${response.status})`);
  }

  if (pageRotationDeltas.size === 0) {
    downloadBlob(await response.blob(), fileName);
    return;
  }

  const [{ PDFDocument, degrees }, pdfBytes] = await Promise.all([
    import("pdf-lib"),
    response.arrayBuffer(),
  ]);
  const pdfDocument = await PDFDocument.load(pdfBytes);

  pdfDocument.getPages().forEach((page, pageIndex) => {
    const rotationDelta = pageRotationDeltas.get(pageIndex);

    if (!rotationDelta) return;

    page.setRotation(
      degrees(
        normalizeDegrees(
          page.getRotation().angle + rotationToDegrees(rotationDelta)
        )
      )
    );
  });

  const nextPdfBytes = await pdfDocument.save();
  const nextPdfBuffer = new ArrayBuffer(nextPdfBytes.byteLength);
  new Uint8Array(nextPdfBuffer).set(nextPdfBytes);

  downloadBlob(
    new Blob([nextPdfBuffer], { type: "application/pdf" }),
    getRotatedPdfDownloadFileName(fileName)
  );
}

export function getThumbnailMetaForPage({
  page,
  pageIndex,
  rotation,
  width,
  imagePadding,
  labelHeight,
  top,
}: {
  page: PdfDocumentObject["pages"][number];
  pageIndex: number;
  rotation: Rotation;
  width: number;
  imagePadding: number;
  labelHeight: number;
  top: number;
}): ThumbMeta {
  const innerWidth = Math.max(1, width - imagePadding * 2);
  const pageWidth = rotation % 2 === 1 ? page.size.height : page.size.width;
  const pageHeight = rotation % 2 === 1 ? page.size.width : page.size.height;
  const imageHeight = Math.round(innerWidth * (pageHeight / pageWidth));
  const wrapperHeight = imagePadding + imageHeight + imagePadding + labelHeight;

  return {
    pageIndex,
    width: innerWidth,
    height: imageHeight,
    wrapperHeight,
    top,
    labelHeight,
    padding: imagePadding,
  };
}

export function buildThumbnailLayout({
  basePageRotations,
  pageRotationDeltas,
  pdfDocument,
  width,
  gap,
  imagePadding,
  labelHeight,
  paddingY,
}: {
  basePageRotations: Rotation[];
  pageRotationDeltas: PageRotationDeltas;
  pdfDocument: PdfDocumentObject | null;
  width: number;
  gap: number;
  imagePadding: number;
  labelHeight: number;
  paddingY: number;
}) {
  if (!pdfDocument) return null;

  let top = paddingY;
  const items = pdfDocument.pages.map((page, pageIndex) => {
    const basePageRotation =
      basePageRotations[pageIndex] ?? normalizeRotation(page.rotation);
    const pageRotation = normalizeRotation(
      basePageRotation + (pageRotationDeltas.get(pageIndex) ?? 0)
    );
    const meta = getThumbnailMetaForPage({
      page,
      pageIndex,
      rotation: pageRotation,
      width,
      imagePadding,
      labelHeight,
      top,
    });

    top += meta.wrapperHeight + gap;
    return meta;
  });

  return {
    items,
    totalHeight: items.length ? top - gap + paddingY : paddingY * 2,
  };
}

export function getVisibleThumbnailItems({
  buffer,
  clientHeight,
  items,
  scrollTop,
}: {
  buffer: number;
  clientHeight: number;
  items: ThumbMeta[];
  scrollTop: number;
}) {
  if (items.length === 0) return [];
  if (clientHeight <= 0)
    return items.slice(0, Math.min(items.length, buffer * 2));

  const viewportBottom = scrollTop + clientHeight;
  let start = items.findIndex(
    (item) => item.top + item.wrapperHeight >= scrollTop
  );

  if (start === -1) start = items.length - 1;

  let end = start;
  while (end < items.length && items[end].top <= viewportBottom) {
    end += 1;
  }

  return items.slice(
    Math.max(0, start - buffer),
    Math.min(items.length, end + buffer)
  );
}