# 12: Tauri sidecar config + cross-platform binaries

**What to build:** Tauri sidecar configuration for Basemind binary distribution across all platforms, with version-pinned remote deployment.

**Blocked by:** 01, 02 (BasemindClient needs sidecar path resolution)

**Status:** ready-for-agent

- [ ] In `src-tauri/tauri.conf.json`:
  ```json
  "bundle": {
    "sidecar": [
      { "path": "../bin/basemind-linux-x86_64", "arch": "x86_64" },
      { "path": "../bin/basemind-linux-aarch64", "arch": "aarch64" },
      { "path": "../bin/basemind-macos-x86_64", "arch": "x86_64" },
      { "path": "../bin/basemind-macos-arm64", "arch": "aarch64" },
      { "path": "../bin/basemind-windows-x86_64.exe", "arch": "x86_64" }
    ]
  }
  ```
- [ ] In `basemind-integration/src/ipc.rs`:
  - `BasemindClient::resolve_sidecar_path()` — uses `tauri::api::path::resource_dir()` + platform detection
  - Embed `BASEMIND_VERSION` const from `build.rs` reading basemind fork's `Cargo.toml`
- [ ] Remote SSH binary sync:
  - `connect_remote()` checks `basemind --version` on remote host
  - Mismatch → upload correct binary to `~/.basemind/bin/` via SSH file transfer
  - Restart remote sidecar
  - Cache binaries per version locally