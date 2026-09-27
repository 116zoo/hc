# 07: Tauri commands: basemind_reveal_entity + basemind_read_redacted_document

**What to build:** Two Tauri commands in `apps/desktop/src/api/commands.rs` for UI-only entity reveal and redacted document reading. Never registered in agent tool registry (structural guarantee).

**Blocked by:** 02 (BasemindClient)

**Status:** ready-for-agent

- [ ] In `apps/desktop/src/api/commands.rs`:
  ```rust
  #[derive(Deserialize)]
  pub struct RevealEntityRequest { pub workspace_id: Option<String>, pub entity_id: String }
  
  #[tauri::command]
  pub async fn basemind_reveal_entity(state: State<'_, AppState>, request: RevealEntityRequest) -> Result<String, String> {
      basemind_client(&state).reveal_entity(&request.entity_id).await.map_err(|e| e.to_string())
  }
  
  #[derive(Deserialize)]
  pub struct ReadRedactedDocumentRequest { pub workspace_id: Option<String>, pub file_path: String }
  
  #[tauri::command]
  pub async fn basemind_read_redacted_document(state: State<'_, AppState>, request: ReadRedactedDocumentRequest) -> Result<RedactedDocumentResponse, String> { ... }
  ```
- [ ] Define `RedactedDocumentResponse { markdown, entities, source_format }`
- [ ] Register both in `apps/desktop/src/lib.rs` `invoke_handler![]`
- [ ] Verify commands work via Tauri IPC from Web UI