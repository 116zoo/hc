# 11: Route document clicks to dual-tab viewer

**What to build:** Modify `FilesPanel.tsx` to open supported document types (PDF, docx, etc.) in the new `'redacted-document-viewer'` tab instead of the plain PDF viewer.

**Blocked by:** 10 (RedactedDocumentTabs)

**Status:** ready-for-agent

- [ ] In `src/web-ui/src/app/components/panels/FilesPanel.tsx`:
  - Modify `handleFileSelect` / `handleFileDoubleClick` (line ~912)
  - For supported document extensions (from `SUPPORTED_DOCUMENT_EXTENSIONS`):
    ```tsx
    createTab({
      type: 'redacted-document-viewer',
      title: fileName,
      data: { sourcePath: filePath, redactedMarkdown: null, entities: [], sourceFormat: ext },
    })
    ```
  - `redactedMarkdown` starts null; RedactedDocumentTabs fetches it via `basemind_read_redacted_document`
- [ ] Ensure fallback to existing viewers for unsupported types