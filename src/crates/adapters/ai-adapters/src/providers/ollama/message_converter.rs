//! Ollama message format converter
//!
//! Ollama's `/api/chat` endpoint is OpenAI-compatible, so we reuse the OpenAI message converter.

use crate::providers::openai::message_converter::OpenAIMessageConverter;
use crate::types::{Message, ToolDefinition};

pub struct OllamaMessageConverter;

impl OllamaMessageConverter {
    /// Convert messages to OpenAI chat completions format (compatible with Ollama /api/chat)
    pub fn convert_messages(messages: Vec<Message>) -> Vec<serde_json::Value> {
        OpenAIMessageConverter::convert_messages(messages)
    }

    /// Convert messages to OpenAI Responses API format (not used by Ollama, but kept for compatibility)
    pub fn convert_messages_to_responses_input(
        messages: Vec<Message>,
    ) -> (Option<String>, Vec<serde_json::Value>) {
        OpenAIMessageConverter::convert_messages_to_responses_input(messages)
    }

    /// Convert tool definitions to OpenAI format (compatible with Ollama)
    pub fn convert_tools(tools: Option<Vec<ToolDefinition>>) -> Option<Vec<serde_json::Value>> {
        OpenAIMessageConverter::convert_tools(tools)
    }
}

#[cfg(test)]
mod tests {
    use super::OllamaMessageConverter;
    use crate::types::{Message, ToolCall};
    use serde_json::json;

    #[test]
    fn converts_basic_messages() {
        let messages = vec![
            Message::system("You are helpful".to_string()),
            Message::user("Hello".to_string()),
        ];
        let converted = OllamaMessageConverter::convert_messages(messages);
        assert_eq!(converted.len(), 2);
        assert_eq!(converted[0]["role"], "system");
        assert_eq!(converted[0]["content"], "You are helpful");
        assert_eq!(converted[1]["role"], "user");
        assert_eq!(converted[1]["content"], "Hello");
    }

    #[test]
    fn converts_tool_calls() {
        let messages = vec![Message::assistant_with_tools(vec![ToolCall {
            id: "call_1".to_string(),
            name: "get_weather".to_string(),
            arguments: json!({"city": "Beijing"}),
            raw_arguments: None,
        }])];
        let converted = OllamaMessageConverter::convert_messages(messages);
        assert_eq!(converted.len(), 1);
        assert_eq!(converted[0]["role"], "assistant");
        assert!(converted[0]["tool_calls"].is_array());
        assert_eq!(converted[0]["tool_calls"][0]["function"]["name"], "get_weather");
    }

    #[test]
    fn converts_image_content() {
        let messages = vec![Message {
            role: "user".to_string(),
            content: Some(
                json!([
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "data:image/png;base64,abc"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Describe this image"
                    }
                ])
                .to_string(),
            ),
            reasoning_content: None,
            thinking_signature: None,
            tool_calls: None,
            tool_call_id: None,
            name: None,
            is_error: None,
            tool_image_attachments: None,
            model_response_replay: None,
        }];
        let converted = OllamaMessageConverter::convert_messages(messages);
        assert_eq!(converted.len(), 1);
        let content = converted[0]["content"].as_array().unwrap();
        assert_eq!(content[0]["type"], "image_url");
        assert!(content[0]["image_url"]["url"].as_str().unwrap().starts_with("data:image/png;base64,"));
        assert_eq!(content[1]["type"], "text");
        assert_eq!(content[1]["text"], "Describe this image");
    }

    #[test]
    fn converts_tool_definitions() {
        let tools = vec![crate::types::ToolDefinition {
            name: "get_weather".to_string(),
            description: "Get weather for a city".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "city": { "type": "string" }
                },
                "required": ["city"]
            }),
        }];
        let converted = OllamaMessageConverter::convert_tools(Some(tools));
        assert!(converted.is_some());
        let tools = converted.unwrap();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0]["type"], "function");
        assert_eq!(tools[0]["function"]["name"], "get_weather");
    }
}