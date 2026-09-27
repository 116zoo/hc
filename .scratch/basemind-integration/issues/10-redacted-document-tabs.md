# 10: RedactedDocumentTabs dual-tab viewer

**What to build:** New panel content type `'redacted-document-viewer'` with dual tabs: Source (PdfViewer) and Redacted (MarkdownRenderer + entity side panel). Two-phase load for responsiveness.

**Blocked by:** 09 (RevealableEntityBadge)

**Status:** ready-for-agent

- [ ] In `src/web-ui/src/app/components/panels/content-canvas/types/content.ts`:
  - Add `'redacted-document-viewer'` to `FILE_VIEWER_TYPES`
- [ ] Create `src/web-ui/src/app/components/panels/content-canvas/RedactedDocumentTabs.tsx`:
  - Toolbar with `ToolbarGroup`: [Source] [Redacted (N PII)] — count from `entities.length`
  - Source tab → `<PdfViewer path={sourcePath} />` (existing pdfjs-dist)
  - Redacted tab → `<MarkdownRenderer content={redactedMarkdown} />` + side panel
  - Side panel: entities grouped by type with counts (e.g., PERSON: 5 · IBAN: 2 · DATE: 3)
- [ ] Two-phase load:
  - Phase 1: `PdfViewer` shows source immediately (direct disk read)
  - Phase 2: Background `basemindAPI.readRedactedDocument()` hydrates Redacted tab
- [ ] Guardrail: Source viewer is visual-only — never used as text source for agent