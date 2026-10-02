//! Basemind Tauri commands for entity reveal, document reading, and prompt pseudonymization.

use crate::api::app_state::AppState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

/// Request to reveal a redacted entity.
#[derive(Debug, Deserialize)]
pub struct RevealEntityRequest {
    pub workspace_id: Option<String>,
    pub entity_id: String,
}

/// Response with the revealed entity value.
#[derive(Debug, Serialize)]
pub struct RevealEntityResponse {
    pub entity_id: String,
    pub original_value: String,
    pub entity_type: String,
}

/// Request to read a redacted document.
#[derive(Debug, Deserialize)]
pub struct ReadRedactedDocumentRequest {
    pub workspace_id: Option<String>,
    pub file_path: String,
}

/// Response with redacted document content.
#[derive(Debug, Serialize)]
pub struct ReadRedactedDocumentResponse {
    pub markdown: String,
    pub entities: Vec<RevealEntityResponse>,
    pub source_format: String,
}

/// Request to pseudonymize a prompt.
#[derive(Debug, Deserialize)]
pub struct PseudonymizePromptRequest {
    pub session_id: String,
    pub text: String,
}

/// Response with pseudonymized text.
#[derive(Debug, Serialize)]
pub struct PseudonymizePromptResponse {
    pub pseudonymized: String,
    pub entity_count: usize,
}

/// Request to rehydrate a pseudonymized prompt.
#[derive(Debug, Deserialize)]
pub struct RehydratePromptRequest {
    pub session_id: String,
    pub text: String,
}

/// Response with rehydrated text.
#[derive(Debug, Serialize)]
pub struct RehydratePromptResponse {
    pub rehydrated: String,
}

/// Tauri command: Reveal a redacted entity by ID.
/// This is UI-only - never exposed to the agent.
#[tauri::command]
pub async fn basemind_reveal_entity(
    _app: AppHandle,
    state: State<'_, AppState>,
    request: RevealEntityRequest,
) -> Result<RevealEntityResponse, String> {
    let basemind = state
        .basemind_client()
        .await
        .ok_or("Basemind not initialized")?;

    let original = basemind
        .reveal_entity(&request.entity_id)
        .await
        .map_err(|e| format!("Failed to reveal entity: {}", e))?;

    // Extract entity type from entity_id (format: category_index)
    let entity_type = request
        .entity_id
        .split('_')
        .next()
        .unwrap_or("UNKNOWN")
        .to_uppercase();

    Ok(RevealEntityResponse {
        entity_id: request.entity_id,
        original_value: original,
        entity_type,
    })
}

/// Tauri command: Read a redacted document.
/// Returns markdown with entity tokens and entity metadata.
#[tauri::command]
pub async fn basemind_read_redacted_document(
    _app: AppHandle,
    state: State<'_, AppState>,
    request: ReadRedactedDocumentRequest,
) -> Result<ReadRedactedDocumentResponse, String> {
    let basemind = state
        .basemind_client()
        .await
        .ok_or("Basemind not initialized")?;

    let result = basemind
        .extract_and_redact_path(&request.file_path)
        .await
        .map_err(|e| format!("Failed to read redacted document: {}", e))?;

    Ok(ReadRedactedDocumentResponse {
        markdown: result.markdown,
        entities: result
            .entities
            .into_iter()
            .map(|e| RevealEntityResponse {
                entity_id: e.entity_id,
                original_value: String::new(), // Not included for security
                entity_type: e.entity_type,
            })
            .collect(),
        source_format: result.source_format,
    })
}

/// Tauri command: Pseudonymize a user prompt before sending to cloud LLM.
#[tauri::command]
pub async fn basemind_pseudonymize_prompt(
    _app: AppHandle,
    state: State<'_, AppState>,
    request: PseudonymizePromptRequest,
) -> Result<PseudonymizePromptResponse, String> {
    #[cfg(feature = "basemind")]
    {
        use openbitfun_basemind_integration::is_local_model_base_url;

        let pseudonymizer = state
            .prompt_pseudonymizer()
            .await
            .ok_or("Prompt pseudonymizer not initialized")?;

        // Check if we should pseudonymize (skip for local models)
        let should_pseudonymize = {
            let base_url = state.get_active_model_base_url(&request.session_id).await;
            match base_url {
                Some(url) => !is_local_model_base_url(&url),
                None => true, // Default to pseudonymize if unknown
            }
        };

        if !should_pseudonymize {
            return Ok(PseudonymizePromptResponse {
                pseudonymized: request.text,
                entity_count: 0,
            });
        }

        let (pseudonymized, rehydration_map) = pseudonymizer
            .pseudonymize(&request.text, &request.session_id)
            .await
            .map_err(|e| format!("Failed to pseudonymize: {}", e))?;

        Ok(PseudonymizePromptResponse {
            pseudonymized,
            entity_count: rehydration_map.len(),
        })
    }

    #[cfg(not(feature = "basemind"))]
    {
        let _ = state;
        let _ = request;
        Err("Basemind feature not enabled".to_string())
    }
}

/// Tauri command: Rehydrate a pseudonymized prompt for display.
#[tauri::command]
pub async fn basemind_rehydrate_prompt(
    _app: AppHandle,
    state: State<'_, AppState>,
    request: RehydratePromptRequest,
) -> Result<RehydratePromptResponse, String> {
    #[cfg(feature = "basemind")]
    {
        let pseudonymizer = state
            .prompt_pseudonymizer()
            .await
            .ok_or("Prompt pseudonymizer not initialized")?;

        let rehydrated = pseudonymizer
            .rehydrate(&request.text, &request.session_id)
            .await
            .map_err(|e| format!("Failed to rehydrate: {}", e))?;

        Ok(RehydratePromptResponse { rehydrated })
    }

    #[cfg(not(feature = "basemind"))]
    {
        let _ = state;
        let _ = request;
        Err("Basemind feature not enabled".to_string())
    }
}