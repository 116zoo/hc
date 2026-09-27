//! Ollama connection health checks

use crate::client::AIClient;
use crate::types::{ConnectionTestResult, Message};
use anyhow::Result;
use log::debug;

/// Test basic connection to Ollama server
pub async fn test_connection(client: &AIClient, max_attempts: usize) -> Result<ConnectionTestResult> {
    let base_url = &client.config.base_url;
    let version_url = format!("{}/api/version", base_url.trim_end_matches('/'));
    
    debug!("Testing Ollama connection at: {}", version_url);
    
    let mut last_error = None;
    
    for attempt in 0..max_attempts {
        let start = std::time::Instant::now();
        
        match client.client.get(&version_url).send().await {
            Ok(response) => {
                let response_time_ms = start.elapsed().as_millis() as u64;
                
                if response.status().is_success() {
                    let version_info: serde_json::Value = response.json().await.unwrap_or_default();
                    let version = version_info.get("version").and_then(|v| v.as_str()).unwrap_or("unknown");
                    
                    return Ok(ConnectionTestResult {
                        success: true,
                        response_time_ms,
                        model_response: Some(format!("Ollama version: {}", version)),
                        message_code: None,
                        error_details: None,
                    });
                } else {
                    last_error = Some(format!("HTTP {}", response.status()));
                }
            }
            Err(e) => {
                last_error = Some(e.to_string());
            }
        }
        
        if attempt < max_attempts - 1 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
    }
    
    Ok(ConnectionTestResult {
        success: false,
        response_time_ms: 0,
        model_response: None,
        message_code: Some(crate::types::ConnectionTestMessageCode::NetworkIssue),
        error_details: last_error,
    })
}

/// Test image input (VLM) capability
pub async fn test_image_input_connection(client: &AIClient, max_attempts: usize) -> Result<ConnectionTestResult> {
    // Use a simple chat request with an image to test VLM capability
    let test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    
    let messages = vec![Message {
        role: "user".to_string(),
        content: Some(serde_json::json!([
            {
                "type": "image_url",
                "image_url": {
                    "url": format!("data:image/png;base64,{}", test_image_base64)
                }
            },
            {
                "type": "text",
                "text": "What color is this image?"
            }
        ]).to_string()),
        reasoning_content: None,
        thinking_signature: None,
        tool_calls: None,
        tool_call_id: None,
        name: None,
        is_error: None,
        tool_image_attachments: None,
        model_response_replay: None,
    }];
    
    let tools: Option<Vec<crate::types::ToolDefinition>> = None;
    
    let mut last_error = None;
    
    for attempt in 0..max_attempts {
        let start = std::time::Instant::now();
        
        match client.send_message_stream_once(messages.clone(), tools.clone(), None).await {
            Ok(mut stream_response) => {
                let response_time_ms = start.elapsed().as_millis() as u64;
                
                // Try to get at least one chunk
                use futures::StreamExt;
                if let Some(chunk_result) = stream_response.stream.next().await {
                    match chunk_result {
                        Ok(_) => {
                            return Ok(ConnectionTestResult {
                                success: true,
                                response_time_ms,
                                model_response: Some("VLM image input test passed".to_string()),
                                message_code: None,
                                error_details: None,
                            });
                        }
                        Err(e) => {
                            last_error = Some(e.to_string());
                        }
                    }
                }
            }
            Err(e) => {
                last_error = Some(e.to_string());
            }
        }
        
        if attempt < max_attempts - 1 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
    }
    
    Ok(ConnectionTestResult {
        success: false,
        response_time_ms: 0,
        model_response: None,
        message_code: Some(crate::types::ConnectionTestMessageCode::ImageInputCheckFailed),
        error_details: last_error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::AIConfig;

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
}