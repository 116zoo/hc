# 03: BasemindWorkspaceFs decorator

**What to build:** `BasemindWorkspaceFs` in `workspace_fs.rs` — a decorator over `LocalWorkspaceFs` that delegates all metadata operations (metadata, exists, is_file, is_dir, read_dir) to the inner filesystem, but redirects content reads (`read_file`, `read_file_text`, `read_file_bounded`, `read_file_text_bounded`) to Basemind for redaction.

**Blocked by:** 01 (crate skeleton), 02 (BasemindClient)

**Status:** ready-for-agent

- [ ] Implement `BasemindWorkspaceFs` struct with `inner: LocalWorkspaceFs`, `basemind: Arc<BasemindClient>`
- [ ] Implement `WorkspaceFileSystem` trait:
  - All metadata ops → delegate to `inner`
  - `read_file*` → call `basemind.extract_and_redact_path()` return markdown bytes
  - `write_file*` and mutating ops → delegate to `inner` (never redact on write)
- [ ] Add optional `redact_filenames` config: when true, `read_dir` runs filenames through lightweight regex PII detector, returns redacted `WorkspaceDirEntry.name` but keeps real `path`
- [ ] Add `basemind_workspace_services(workspace_root, basemind)` constructor in `services-core/src/workspace.rs` (feature-gated)
- [ ] Wire injection in `assembly/core` session creation: swap `LocalWorkspaceFs` for `BasemindWorkspaceFs::new(basemind_client)` under `cfg(feature = "basemind")`
- [ ] Preserve upstream `local_workspace_services()` for non-basemind builds