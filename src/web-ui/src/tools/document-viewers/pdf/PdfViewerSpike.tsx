"use client";

import * as React from "react";
import { EmbedPDF } from "@embedpdf/core/react";
import { DocumentManagerPluginPackage } from "@embedpdf/plugin-document-manager/react";
import { InteractionManagerPluginPackage } from "@embedpdf/plugin-interaction-manager/react";
import { RenderPluginPackage } from "@embedpdf/plugin-render/react";
import { RotatePluginPackage } from "@embedpdf/plugin-rotate/react";
import { ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import { SearchPluginPackage } from "@embedpdf/plugin-search/react";
import { SelectionPluginPackage } from "@embedpdf/plugin-selection/react";
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react";
import { TilingPluginPackage } from "@embedpdf/plugin-tiling/react";
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { ZoomPluginPackage } from "@embedpdf/plugin-zoom/react";
import type { PluginBatchRegistration, IPlugin } from "@embedpdf/core";
import { loadSharedPdfEngine } from "@/lib/pdf-thumbnail-utils";
import type { PdfEngine } from "@embedpdf/models";

// Simple cn utility for class name merging
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const pluginPackages: PluginBatchRegistration<IPlugin, any, any, any>[] = [
  { package: DocumentManagerPluginPackage },
  { package: InteractionManagerPluginPackage },
  { package: RenderPluginPackage },
  { package: RotatePluginPackage },
  { package: ScrollPluginPackage },
  { package: SearchPluginPackage },
  { package: SelectionPluginPackage },
  { package: ThumbnailPluginPackage },
  { package: TilingPluginPackage },
  { package: ViewportPluginPackage },
  { package: ZoomPluginPackage },
];

interface PdfViewerSpikeProps {
  src: string;
  fileName?: string;
  className?: string;
}

export function PdfViewerSpike({ src, fileName, className }: PdfViewerSpikeProps) {
  const [engine, setEngine] = React.useState<PdfEngine | null>(null);
  const [engineError, setEngineError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadSharedPdfEngine().then(
      (loadedEngine) => {
        if (!cancelled) setEngine(loadedEngine);
      },
      (error) => {
        if (!cancelled) setEngineError(error);
      }
    );
    return () => { cancelled = true; };
  }, []);

  if (engineError) {
    return (
      <div className={cn("flex h-[600px] w-full items-center justify-center bg-muted/30", className)}>
        <div className="text-center text-destructive">
          <p>Failed to load PDF engine: {engineError.message}</p>
        </div>
      </div>
    );
  }

  if (!engine) {
    return (
      <div className={cn("flex h-[600px] w-full items-center justify-center bg-muted/30", className)}>
        <div className="text-center text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading PDF engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[600px] w-full flex-col bg-background", className)}>
      {/* Toolbar */}
      <div className="flex h-12 min-h-12 items-center justify-between border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-[300px]">
            {fileName || src.split("/").pop() || "PDF Document"}
          </span>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <EmbedPDF
          engine={engine}
          plugins={pluginPackages}
          config={{
            defaultScale: 1.0,
            defaultRotation: 0,
          }}
        >
          {(state) => (
            <div className="flex flex-1 min-h-0 relative overflow-hidden">
              {state.activeDocument?.document ? (
                <div className="flex flex-1 min-h-0 overflow-auto bg-muted/30 p-8">
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">PDF Loaded Successfully!</h3>
                    <p className="text-muted-foreground mb-4">
                      The @embedpdf/core integration is working.
                    </p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Document ID: <code className="bg-muted px-1 rounded">{state.activeDocument.id}</code></p>
                      <p>Pages: <code className="bg-muted px-1 rounded">{state.activeDocument.document.pageCount}</code></p>
                      <p>Status: <code className="bg-muted px-1 rounded">{state.activeDocument.status}</code></p>
                    </div>
                    <p className="mt-6 text-xs text-muted-foreground">
                      Full viewer implementation requires per-page RenderLayer components
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p>Loading document...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </EmbedPDF>
      </div>
    </div>
  );
}