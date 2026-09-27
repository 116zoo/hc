//! Ollama provider module
//!
//! Ollama provides an OpenAI-compatible chat completions API at `/api/chat`.
//! This module reuses the OpenAI message converter and provides Ollama-specific
//! request building, model discovery, and health checks.

pub mod discovery;
pub mod healthcheck;
pub mod message_converter;
pub mod request;

pub use message_converter::OllamaMessageConverter;