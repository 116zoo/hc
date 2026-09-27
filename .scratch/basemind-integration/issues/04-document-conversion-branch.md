# 04: Document conversion branch

**What to build:** Extend `ConvertedDocument` with `redacted_entities`, add `basemind_extract_and_redact()` function, and branch the call site in `file_read_tool.rs` with a feature flag — preserving the upstream line for clean rebases.

**Blocked by:** 01 (crate skeleton), 02 (BasemindClient)

**Status:** ready-for-agent

- [ ] In `tool-execution/src/fs/document.rs` (under `feature = "document-read"`):
  - Add `RedactedEntity { entity_id, entity_type, occurrence_count }` to `ConvertedDocument`
  - Keep existing `DocumentCache` (key = sha256 + Format) and `Semaphore` (concurrency=1)
- [ ] In `basemind-integration/src/document_convert.rs`:
  - Implement `basemind_extract_and_redact(bytes, path_hint) -> Result<ConvertedDocument>`
  - Acquire semaphore, call `basemind_client().extract_and_redact()`, release permit
  - Return markdown + source_format + redacted_entities
- [ ] In `assembly/core/src/agentic/tools/implementations/file_read_tool.rs` (line ~219):
  ```rust
  #[cfg(feature = "basemind")]
  let conversion_call = basemind_integration::basemind_extract_and_redact(bytes, resolved_path.to_string());
  #[cfg(not(feature = "basemind"))]
  let conversion_call = convert_document_to_markdown(bytes, resolved_path.to_string());
  ```
  - Keep `DOCUMENT_CONVERSION_TIMEOUT` wrapper unchanged
- [ ] Add `basemind` feature to `tool-execution/Cargo.toml` and `assembly/core/Cargo.toml`