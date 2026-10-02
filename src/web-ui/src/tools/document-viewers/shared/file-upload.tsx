"use client";

import * as React from "react";
import { Upload, X, FileText, FileSpreadsheet, FilePresentation, Loader2 } from "lucide-react";
import { Button, Input } from "@openbitfun/ui";
import { useI18n } from "@/infrastructure/i18n";
import { FileThumbnail } from "./file-thumbnail";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

interface UploadedFile {
  file: File;
  id: string;
  previewUrl?: string;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface FileUploadProps {
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  onFilesChange?: (files: UploadedFile[]) => void;
  onFileUpload?: (file: UploadedFile) => Promise<void>;
  className?: string;
  disabled?: boolean;
  showDropzone?: boolean;
  dropzoneText?: string;
  dropzoneIcon?: React.ReactNode;
}

export function FileUpload({
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md",
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024, // 100MB
  onFilesChange,
  onFileUpload,
  className,
  disabled = false,
  showDropzone = true,
  dropzoneText,
  dropzoneIcon,
}: FileUploadProps) {
  const { t } = useI18n("tools");
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = React.useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) {
          break;
        }

        if (file.size > maxSize) {
          validFiles.push({
            file,
            id: `${file.name}-${Date.now()}`,
            progress: 0,
            status: "error",
            error: t("editor.fileUpload.fileTooLarge", { maxSize: formatFileSize(maxSize) }),
          });
          continue;
        }

        if (accept && !matchAccept(file, accept)) {
          validFiles.push({
            file,
            id: `${file.name}-${Date.now()}`,
            progress: 0,
            status: "error",
            error: t("editor.fileUpload.invalidFileType"),
          });
          continue;
        }

        validFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          progress: 0,
          status: "pending",
        });
      }

      setFiles((prev) => {
        const updated = [...prev, ...validFiles];
        onFilesChange?.(updated);
        return updated;
      });

      // Auto-upload if handler provided
      if (onFileUpload) {
        validFiles.forEach((f) => uploadFile(f));
      }
    },
    [files.length, maxFiles, maxSize, accept, onFilesChange, onFileUpload]
  );

  const uploadFile = React.useCallback(
    async (file: UploadedFile) => {
      if (!onFileUpload || file.status === "uploading") return;

      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "uploading" as const } : f))
      );

      try {
        await onFileUpload(file);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "complete" as const, progress: 100 } : f))
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "error" as const, error: error instanceof Error ? error.message : String(error) }
              : f
          )
        );
      }
    },
    [onFileUpload]
  );

  const removeFile = React.useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        onFilesChange?.(updated);
        return updated;
      });
    },
    [onFilesChange]
  );

  const retryFile = React.useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file && file.status === "error") {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: "pending" as const, error: undefined } : f))
        );
        if (onFileUpload) uploadFile(file);
      }
    },
    [files, onFileUpload, uploadFile]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragActive(true);
  }, [disabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const openFileDialog = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  if (!showDropzone && files.length === 0) {
    return (
      <Button
        variant="outline"
        onClick={openFileDialog}
        disabled={disabled}
        className={cn("gap-2", className)}
      >
        <Upload className="w-4 h-4" />
        {t("editor.fileUpload.uploadFiles")}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={t("editor.fileUpload.selectFiles")}
      />

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFileDialog();
          }
        }}
        aria-label={t("editor.fileUpload.dropzoneLabel")}
      >
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {dropzoneIcon || <Upload className="w-10 h-10 text-muted-foreground/50 mb-4" />}
          <p className="text-lg font-medium text-foreground mb-1">
            {dropzoneText || t("editor.fileUpload.dropzoneText")}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {t("editor.fileUpload.dropzoneSubtext", { maxSize: formatFileSize(maxSize) })}
          </p>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openFileDialog(); }} disabled={disabled}>
            {t("editor.fileUpload.browseFiles")}
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2" role="list" aria-label={t("editor.fileUpload.uploadedFiles")}>
          {files.map((file) => (
            <FileUploadItem
              key={file.id}
              file={file}
              onRemove={() => removeFile(file.id)}
              onRetry={() => retryFile(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileUploadItem({ file, onRemove, onRetry }: { file: UploadedFile; onRemove: () => void; onRetry: () => void }) {
  const { t } = useI18n("tools");

  const getStatusIcon = () => {
    switch (file.status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "complete":
        return <FileText className="w-4 h-4 text-green-500" />;
      case "error":
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case "uploading":
        return `${t("editor.fileUpload.uploading")} ${file.progress}%`;
      case "complete":
        return t("editor.fileUpload.complete");
      case "error":
        return file.error || t("editor.fileUpload.error");
      default:
        return t("editor.fileUpload.pending");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
        file.status === "error" && "border-destructive/50 bg-destructive/5",
        file.status === "complete" && "border-green-500/50 bg-green-500/5"
      )}
      role="listitem"
    >
      <FileThumbnail fileName={file.file.name} size="sm" showName={false} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{file.file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.file.size)}</span>
          <span>•</span>
          <span className={cn(file.status === "error" && "text-destructive", file.status === "complete" && "text-green-500")}>
            {getStatusText()}
          </span>
        </div>
        {file.status === "uploading" && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {file.status === "error" && (
          <Button variant="ghost" size="icon" onClick={onRetry} aria-label={t("editor.fileUpload.retry")}>
            <Loader2 className="w-4 h-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={t("editor.fileUpload.remove")}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function matchAccept(file: File, accept: string): boolean {
  const acceptTypes = accept.split(",").map((t) => t.trim());
  for (const type of acceptTypes) {
    if (type.startsWith(".")) {
      if (file.name.toLowerCase().endsWith(type.toLowerCase())) return true;
    } else if (type.endsWith("/*")) {
      if (file.type.startsWith(type.slice(0, -1))) return true;
    } else if (file.type === type) {
      return true;
    }
  }
  return false;
}