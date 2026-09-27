# 17: Interception in desktop_dialog_turn_request()

**What to build:** Branch in `apps/desktop/src/api/agentic_api.rs` `desktop_dialog_turn_request()` to pseudonymize user prompts for cloud models, skip for local models. Also handle history rehydration on session restore.

**Blocked by:** 16 (PromptPseudonymizer), 15 (local model detection)

**Status:** ready-for-agent

- [ ] Modify `desktop_dialog_turn_request()` signature to accept `state: &AppState`
- [ ] Add pseudonymization logic:
  ```rust
  #[cfg(feature = "basemind")]
  let should_pseudonymize = {
      let model_name = request.agent_type.clone();
      let base_url = get_model_base_url(&state, &model_name).await?;
      !basemind_integration::is_local_model_base_url(&base_url)
  };
  
  #[cfg(feature = "basemind")]
  let (pseudonymized_input, rehydration_map) = if should_pseudonymize {
      let pseudonymizer = basemind_integration::get_prompt_pseudonymizer(&state)?;
      tokio::task::block_in_place(|| {
          tokio::runtime::Handle::current().block_on(async {
              pseudonymizer.pseudonymize(&request.user_input, &request.session_id).await
          })
      })?
  } else {
      (request.user_input.clone(), HashMap::new())
  };
  
  // Store rehydration map in metadata for debugging
  let mut metadata = desktop_user_message_metadata(request.user_message_metadata);
  if !rehydration_map.is_empty() {
      metadata.insert("prompt_rehydration".to_string(), serde_json::to_value(rehydration_map).unwrap_or_default());
  }
  
  Ok(AgentDialogTurnRequest {
      message: pseudonymized_input,
      original_message: request.original_user_input.or(Some(request.user_input)),
      metadata,
      // ...
  })
  ```
- [ ] In session restore functions (`restore_session_with_turns`):
  ```rust
  #[cfg(feature = "basemind")]
  {
      let pseudonymizer = basemind_integration::get_prompt_pseudonymizer(&state)?;
      for turn in turns.iter_mut() {
          if let Some(user_msg) = turn.user_message.as_mut() {
              user_msg.content = pseudonymizer.rehydrate(&user_msg.content, &session_id).await
                  .unwrap_or_else(|_| user_msg.content.clone());
          }
      }
  }
  ```
- [ ] Ensure `original_user_input` is preserved for UI display