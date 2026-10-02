"use client";

import * as React from "react";
import { Button, IconButton, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@openbitfun/ui";
import { Check, X, MessageSquareText, MoreHorizontal, CheckCheck } from "lucide-react";
import { useI18n } from "@/infrastructure/i18n";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

import type { DocxTrackedChange, DocxComment, DocxTrackedChangeCardRenderProps, DocxCommentCardRenderProps } from "@extend-ai/react-docx";

export function createDocxTrackedChangeCardRenderer(
  trackChanges?: ReturnType<typeof import("@extend-ai/react-docx").useDocxTrackChanges>["provides"]
) {
  return function DocxTrackedChangeCard({
    change,
    kindLabel,
    snippet,
    formattedDate,
    accentColor,
    documentTheme,
    pageIndex,
    style,
    accept,
    reject,
  }: DocxTrackedChangeCardRenderProps) {
    const { t } = useI18n("tools");

    return (
      <TooltipProvider>
        <div
          className={cn(
            "relative flex w-full items-start gap-2 rounded-md bg-card p-2 text-xs transition-colors",
            "group-hover:bg-accent/50",
            documentTheme === "dark" && "bg-muted/50"
          )}
          style={style}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">{kindLabel}</span>
              {formattedDate && (
                <span className="text-muted-foreground">{formattedDate}</span>
              )}
            </div>
            <p className="mt-1 text-muted-foreground truncate">{snippet}</p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={accept}
                  className="text-green-600 hover:bg-green-100"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("editor.docxViewer.acceptChange")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={reject}
                  className="text-red-600 hover:bg-red-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("editor.docxViewer.rejectChange")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  };
}

export function createDocxCommentCardRenderer(
  comments?: ReturnType<typeof import("@extend-ai/react-docx").useDocxComments>["provides"]
) {
  return function DocxCommentCard({
    comment,
    snippet,
    formattedDate,
    accentColor,
    documentTheme,
    pageIndex,
    style,
    setResolved,
  }: DocxCommentCardRenderProps) {
    const { t } = useI18n("tools");

    return (
      <TooltipProvider>
        <div
          className={cn(
            "relative flex w-full items-start gap-2 rounded-md bg-card p-2 text-xs transition-colors",
            "group-hover:bg-accent/50",
            documentTheme === "dark" && "bg-muted/50"
          )}
          style={style}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <MessageSquareText className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground">
                {comment.author || t("editor.docxViewer.anonymous")}
              </span>
              {formattedDate && (
                <span className="text-muted-foreground">{formattedDate}</span>
              )}
              {comment.resolved && (
                <span className="text-green-600">{t("editor.docxViewer.resolved")}</span>
              )}
            </div>
            <p className="mt-1 text-muted-foreground truncate">{snippet}</p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setResolved(!comment.resolved)}
                  className={cn(comment.resolved && "text-green-600")}
                >
                  {comment.resolved ? (
                    <CheckCheck className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {comment.resolved
                  ? t("editor.docxViewer.reopenComment")
                  : t("editor.docxViewer.resolveComment")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  {t("editor.docxViewer.commentActions")}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  };
}