"use client";

import * as React from "react";
import { PdfViewerSpike } from "./pdf/PdfViewerSpike";
import { FileUpload } from "./shared/file-upload";
import { FileThumbnail } from "./shared/file-thumbnail";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function SpikeTestPage() {
  // Test with a sample PDF URL - using a publicly available test PDF
  const testPdfUrl = "https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf";
  const [selectedFile, setSelectedFile] = React.useState<string | null>(testPdfUrl);

  const handleFileUpload = async (file: any) => {
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (file.file.type === "application/pdf") {
      setSelectedFile(URL.createObjectURL(file.file));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background px-4 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <h1 className="text-2xl font-bold">Extend UI Document Viewers Spike Test</h1>
          <div className="text-sm text-muted-foreground">
            Testing @embedpdf/react + @extend-ai/react-* integration
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <div className="space-y-6">
          {/* File Upload Test */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h2 className="text-lg font-medium mb-4">File Upload Test</h2>
            <FileUpload
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv"
              onFileUpload={handleFileUpload}
              className="w-full max-w-2xl"
            />
          </div>

          {/* PDF Viewer Test */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h2 className="text-lg font-medium mb-4">PDF Viewer Test</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Loading a test PDF from W3C. This validates the @embedpdf/core integration.
            </p>
            <div className="h-[700px]">
              <PdfViewerSpike
                src={selectedFile || testPdfUrl}
                fileName="wcag-table-test.pdf"
                className="h-full w-full"
              />
            </div>
          </div>

          {/* File Thumbnail Test */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h2 className="text-lg font-medium mb-4">File Thumbnail Test</h2>
            <div className="flex flex-wrap gap-4">
              <FileThumbnail fileName="document.pdf" mimeType="application/pdf" size="md" />
              <FileThumbnail fileName="spreadsheet.xlsx" mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" size="md" />
              <FileThumbnail fileName="presentation.pptx" mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation" size="md" />
              <FileThumbnail fileName="image.png" mimeType="image/png" size="md" />
              <FileThumbnail fileName="code.ts" mimeType="text/typescript" size="md" />
              <FileThumbnail fileName="archive.zip" mimeType="application/zip" size="md" />
            </div>
          </div>

          {/* Integration Status */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h2 className="text-lg font-medium mb-4">Integration Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { name: "@embedpdf/core", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-render", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-scroll", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-zoom", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-search", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-selection", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-thumbnail", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-document-manager", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-interaction-manager", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-rotate", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-tiling", status: "installed", version: "2.15.1" },
                { name: "@embedpdf/plugin-viewport", status: "installed", version: "2.15.1" },
                { name: "@extend-ai/react-docx", status: "installed", version: "0.9.2" },
                { name: "@extend-ai/react-pptx", status: "installed", version: "0.2.1" },
                { name: "@extend-ai/react-xlsx", status: "installed", version: "0.16.4" },
                { name: "@glideapps/glide-data-grid", status: "installed", version: "6.0.4-alpha24" },
              ].map((pkg) => (
                <div
                  key={pkg.name}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-background",
                    pkg.status === "installed" && "border-green-500/30 bg-green-500/5"
                  )}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium truncate">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">v{pkg.version}</p>
                  </div>
                  <span className="text-xs text-green-500 font-medium">{pkg.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SpikeTestPage;