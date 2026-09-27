# 21: E2E verification: document redaction flow

**What to build:** End-to-end test covering the document redaction pipeline: open PDF → dual-tab shows Source | Redacted (N PII) → click badge → reveal overlay.

**Blocked by:** 11 (FilesPanel integration), 10 (RedactedDocumentTabs)

**Status:** ready-for-agent

- [ ] Create `pnpm --filter web-ui test:e2e redacted-document` test:
  - Launch desktop app with test workspace containing sample PDF with PII
  - Open FilesPanel, double-click PDF
  - Verify tab type is `'redacted-document-viewer'`
  - Verify Source tab shows `PdfViewer` with original content
  - Verify Redacted tab shows `MarkdownRenderer` with `[PERSON_1]`, `[IBAN_1]` tokens
  - Verify toolbar shows `(N PII)` count matching entity count
  - Click `[PERSON_1]` badge → verify overlay shows "Jean Dupont"
  - Verify overlay dismisses on outside click / Escape
  - Verify revealed value NOT in markdown source or conversation history
  - Test with multiple document types: PDF, DOCX, XLSX
- [ ] Test redaction persistence: close/reopen tab → entities still redacted
- [ ] Test remote workspace: same flow works over SSH