"use client";

import * as React from "react";
import { FileText, FileSpreadsheet, FilePresentation, FileImage, FileVideo, FileAudio, FileCode, FileArchive, FileIcon } from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { ReactElement } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

interface FileThumbnailProps {
  fileName: string;
  mimeType?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "w-16 h-16 text-2xl",
  md: "w-24 h-24 text-3xl",
  lg: "w-32 h-32 text-4xl",
  xl: "w-40 h-40 text-5xl",
};

const nameSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function FileThumbnail({ fileName, mimeType, className, size = "md", showName = true, onClick }: FileThumbnailProps) {
  const { t } = useI18n("tools");
  const IconComponent = getFileIcon(mimeType, fileName);
  const iconColor = getFileIconColor(mimeType, fileName);
  const ext = getFileExtension(fileName).toUpperCase();

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-lg bg-card border border-border transition-all duration-200 hover:border-primary/50 hover:shadow-lg",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-t-lg bg-muted/50 transition-colors duration-200",
          "group-hover:bg-primary/10"
        )}
        style={{ aspectRatio: "1 / 1" }}
      >
        <IconComponent className={cn("text-muted-foreground/60 group-hover:text-foreground transition-colors duration-200", sizeClasses[size], iconColor)} aria-hidden="true" />
      </div>

      {showName && (
        <div className={cn("flex w-full flex-col items-center gap-0.5 px-2 py-2 text-center", nameSizeClasses[size])}>
          <span className="font-medium text-foreground truncate max-w-full">{fileName}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{ext}</span>
        </div>
      )}
    </div>
  );
}

function getFileIcon(mimeType: string | undefined, fileName: string): React.ElementType {
  const ext = getFileExtension(fileName).toLowerCase();

  if (mimeType) {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.startsWith("video/")) return FileVideo;
    if (mimeType.startsWith("audio/")) return FileAudio;
    if (mimeType === "application/pdf") return FileText;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return FilePresentation;
    if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
    if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return FileArchive;
    if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("json") || mimeType.includes("xml")) return FileCode;
  }

  switch (ext) {
    case "pdf":
      return FileText;
    case "doc":
    case "docx":
    case "txt":
    case "md":
    case "rtf":
      return FileText;
    case "xls":
    case "xlsx":
    case "csv":
    case "tsv":
      return FileSpreadsheet;
    case "ppt":
    case "pptx":
    case "key":
      return FilePresentation;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
    case "tiff":
      return FileImage;
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
    case "webm":
      return FileVideo;
    case "mp3":
    case "wav":
    case "flac":
    case "ogg":
    case "m4a":
      return FileAudio;
    case "js":
    case "ts":
    case "jsx":
    case "tsx":
    case "py":
    case "rs":
    case "go":
    case "java":
    case "cpp":
    case "c":
    case "h":
    case "json":
    case "xml":
    case "yaml":
    case "yml":
      return FileCode;
    case "zip":
    case "tar":
    case "gz":
    case "rar":
    case "7z":
      return FileArchive;
    default:
      return FileIcon;
  }
}

function getFileIconColor(mimeType: string | undefined, fileName: string): string {
  const ext = getFileExtension(fileName).toLowerCase();

  if (mimeType?.startsWith("image/")) return "text-green-500";
  if (mimeType?.startsWith("video/")) return "text-purple-500";
  if (mimeType?.startsWith("audio/")) return "text-orange-500";
  if (mimeType === "application/pdf") return "text-red-500";

  switch (ext) {
    case "pdf":
      return "text-red-500";
    case "doc":
    case "docx":
      return "text-blue-500";
    case "xls":
    case "xlsx":
    case "csv":
      return "text-green-500";
    case "ppt":
    case "pptx":
      return "text-orange-500";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return "text-green-500";
    case "mp4":
    case "mov":
      return "text-purple-500";
    case "mp3":
    case "wav":
      return "text-orange-500";
    case "js":
    case "ts":
      return "text-yellow-500";
    case "py":
      return "text-blue-500";
    case "rs":
      return "text-orange-500";
    case "zip":
    case "tar":
    case "gz":
      return "text-gray-500";
    default:
      return "text-muted-foreground";
  }
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function getMimeTypeFromExtension(ext: string): string {
  const lowerExt = ext.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    md: "text/markdown",
    rtf: "application/rtf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    zip: "application/zip",
    json: "application/json",
    xml: "application/xml",
  };
  return mimeTypes[lowerExt] || "application/octet-stream";
}