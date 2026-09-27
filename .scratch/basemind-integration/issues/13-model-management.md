# 13: Model management (lazy download + cache)

**What to build:** Model download, verification, and caching in `models.rs`. Models download on first use (PII NER, embeddings, optional OCR) with progress reporting.

**Blocked by:** 12 (sidecar config)

**Status:** ready-for-agent

- [ ] Define `ModelSpec`:
  ```rust
  pub struct ModelSpec {
      pub name: String,           // "pii-multilingual", "embedding-minilm", "ocr-multilingual"
      pub version: String,
      pub download_url: String,   // HF Hub primary, GitHub Releases fallback
      pub sha256: String,
      pub required: bool,         // false for OCR
      pub size_bytes: u64,
  }
  ```
- [ ] Implement `BasemindClient::ensure_models(&[ModelSpec])`:
  - Check local cache (`~/.basemind/models/` or config override)
  - Missing → download with progress via Tauri event `basemind://model-download-progress`
  - Verify SHA256, extract if compressed
  - Notify completion
- [ ] Model list:
  - `pii-multilingual` (~150MB) — NER for 50+ languages, required
  - `embedding-minilm` (~90MB) — RAG vector index, required
  - `ocr-multilingual` (~200MB) — optional, only if OCR enabled
- [ ] Settings integration: model status (downloaded/downloading/failed), manual download/remove buttons