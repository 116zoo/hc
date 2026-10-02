import * as React from 'react';
import { useNavSceneStore } from '../../stores/navSceneStore';
import { 
  PDFViewer, 
  DocxViewer, 
  PptxViewer, 
  XlsxViewer 
} from '@/tools/document-viewers';
import { useI18n } from '@/infrastructure/i18n';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

interface DocumentViewerSceneProps {
  documentPath?: string;
  documentName?: string;
  mimeType?: string;
}

function getViewerType(mimeType: string | undefined, fileName: string | undefined): 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'unknown' {
  // First check MIME type
  if (mimeType) {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword') return 'docx';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
        mimeType === 'application/vnd.ms-powerpoint') return 'pptx';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'text/csv') return 'xlsx';
  }
  
  // Fallback to file extension
  const ext = fileName?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'doc':
    case 'docx': return 'docx';
    case 'ppt':
    case 'pptx': return 'pptx';
    case 'xls':
    case 'xlsx':
    case 'csv': return 'xlsx';
    default: return 'unknown';
  }
}

export function DocumentViewerScene({ documentPath, documentName, mimeType }: DocumentViewerSceneProps) {
  const { t } = useI18n('scenes/documentViewer');
  const setDocument = useNavSceneStore(state => state.setDocumentViewerDocument);

  React.useEffect(() => {
    if (documentPath) {
      setDocument({ path: documentPath, name: documentName, mimeType });
    }
  }, [documentPath, documentName, mimeType, setDocument]);

  const viewerType = getViewerType(mimeType, documentName);

  return (
    <div className={cn("flex h-full w-full flex-col", "openbitfun-document-viewer-scene")}>
      <div className="flex h-full w-full flex-1">
        {documentPath ? (
          <ViewerWrapper 
            viewerType={viewerType} 
            src={documentPath} 
            fileName={documentName}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">{t('documentViewer.title')}</p>
              <p>{t('documentViewer.noDocument')}</p>
              <p className="text-sm mt-1">{t('documentViewer.selectDocument')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewerWrapper({ viewerType, src, fileName }: { viewerType: ReturnType<typeof getViewerType>; src: string; fileName?: string }) {
  switch (viewerType) {
    case 'pdf':
      return <PDFViewer src={src} fileName={fileName} className="h-full w-full" />;
    case 'docx':
      return <DocxViewer src={src} fileName={fileName} className="h-full w-full" />;
    case 'pptx':
      return <PptxViewer src={src} fileName={fileName} className="h-full w-full" />;
    case 'xlsx':
      return <XlsxViewer src={src} fileName={fileName} className="h-full w-full" />;
    default:
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted/30">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Unsupported format</p>
            <p>File type not supported for preview</p>
          </div>
        </div>
      );
  }
}

export default DocumentViewerScene;