//! Ollama model discovery via /api/tags

use crate::client::AIClient;
use crate::types::RemoteModelInfo;
use anyhow::Result;
use log::debug;

/// Ollama model entry from /api/tags
#[derive(Debug, Clone, serde::Deserialize)]
struct OllamaModel {
    name: String,
    #[serde(rename = "model")]
    model_name: Option<String>,
    #[serde(rename = "modified_at")]
    modified_at: Option<String>,
    #[serde(rename = "size")]
    size: Option<u64>,
    #[serde(rename = "digest")]
    digest: Option<String>,
    details: Option<OllamaModelDetails>,
}

/// Ollama model details
#[derive(Debug, Clone, serde::Deserialize)]
struct OllamaModelDetails {
    #[serde(rename = "parent_model")]
    parent_model: Option<String>,
    format: Option<String>,
    family: Option<String>,
    families: Option<Vec<String>>,
    parameter_size: Option<String>,
    quantization_level: Option<String>,
}

/// Ollama /api/tags response
#[derive(Debug, Clone, serde::Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

/// List models from Ollama /api/tags endpoint
pub async fn list_models(client: &AIClient) -> Result<Vec<RemoteModelInfo>> {
    let base_url = &client.config.base_url;
    let tags_url = format!("{}/api/tags", base_url.trim_end_matches('/'));
    
    debug!("Fetching Ollama models from: {}", tags_url);
    
    let response = client.client.get(&tags_url).send().await?;
    
    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Ollama model list request failed with status: {}",
            response.status()
        ));
    }
    
    let tags_response: OllamaTagsResponse = response.json().await?;
    
    let mut models = Vec::new();
    for model in tags_response.models {
        let display_name = model.details.as_ref()
            .and_then(|d| d.family.clone())
            .or_else(|| model.model_name.clone())
            .or_else(|| {
                model.name.split(':').next().map(|s| s.to_string())
            });
        
        models.push(RemoteModelInfo {
            id: model.name.clone(),
            display_name,
            routing: None,
        });
    }
    
    debug!("Found {} Ollama models", models.len());
    Ok(models)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::AIConfig;
    use serde_json::json;

    fn make_test_client() -> AIClient {
        AIClient::new(AIConfig {
            name: "ollama-test".to_string(),
            base_url: "http://localhost:11434".to_string(),
            request_url: "http://localhost:11434/api/chat".to_string(),
            api_key: "ollama".to_string(),
            model: "mistral".to_string(),
            format: "ollama".to_string(),
            context_window: 32768,
            max_tokens: Some(8192),
            temperature: None,
            top_p: None,
            inline_think_in_text: false,
            custom_headers: None,
            custom_headers_mode: None,
            skip_ssl_verify: false,
            custom_request_body: None,
            custom_request_body_mode: None,
        })
    }

    #[test]
    fn parses_ollama_tags_response() {
        let json = json!({
            "models": [
                {
                    "name": "mistral:latest",
                    "model": "mistral",
                    "modified_at": "2024-01-01T00:00:00Z",
                    "size": 4109826048u64,
                    "digest": "abc123",
                    "details": {
                        "parent_model": "",
                        "format": "gguf",
                        "family": "mistral",
                        "families": ["mistral"],
                        "parameter_size": "7B",
                        "quantization_level": "Q4_K_M"
                    }
                },
                {
                    "name": "llama3.2:latest",
                    "model": "llama3.2",
                    "modified_at": "2024-01-01T00:00:00Z",
                    "size": 2019826048u64,
                    "digest": "def456",
                    "details": {
                        "parent_model": "",
                        "format": "gguf",
                        "family": "llama",
                        "families": ["llama"],
                        "parameter_size": "3B",
                        "quantization_level": "Q4_K_M"
                    }
                }
            ]
        });
        
        let response: OllamaTagsResponse = serde_json::from_value(json).unwrap();
        assert_eq!(response.models.len(), 2);
        assert_eq!(response.models[0].name, "mistral:latest");
        assert_eq!(response.models[0].details.as_ref().unwrap().family, Some("mistral".to_string()));
        assert_eq!(response.models[1].details.as_ref().unwrap().family, Some("llama".to_string()));
    }
}