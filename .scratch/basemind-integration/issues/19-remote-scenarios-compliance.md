# 19: Remote scenarios compliance

**What to build:** Product Operation Registry entries and Peer Host Capability for Basemind commands across all four remote scenarios.

**Blocked by:** 07 (Tauri commands), 11 (FilesPanel integration)

**Status:** ready-for-agent

- [ ] In `src/crates/contracts/product-domains/src/remote_surface/table.rs`:
  - Add row for `basemind_reveal_entity` with `RemoteWorkspaceStance::Supported`
  - Add row for `basemind_read_redacted_document` with `RemoteWorkspaceStance::Supported`
  - Both are UI-only commands, so controller-local execution is correct
- [ ] Define `PeerHostCapability::Basemind` in peer device registry
- [ ] Advertise capability from remote host when Basemind is enabled
- [ ] Verify routing:
  - Remote Workspace: Basemind runs on SSH host, commands proxied via `RemoteCommand`
  - Remote Control (Mobile/IM): Controller pseudonymizes, peer executes
  - Peer Device Mode: Controller shell local, Basemind runs on peer host
  - Detached Dispatch: Target host runs headless, Basemind sidecar spawned by target
- [ ] Update closure test in `src/crates/contracts/product-domains/src/remote_surface/table.rs` to include new commands