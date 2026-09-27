# 06: rag_search tool + registration

**What to build:** New agent tool `rag_search` that queries the workspace RAG index (built from redacted markdown only). Registered in the tool registry feature-gated.

**Blocked by:** 01, 02, 03, 04 (needs BasemindClient and document pipeline)

**Status:** ready-for-agent

- [ ] Create `assembly/core/src/agentic/tools/implementations/rag_search_tool.rs`:
  ```rust
  pub struct RagSearchTool { basemind: Arc<BasemindClient> }
  #[async_trait]
  impl Tool for RagSearchTool {
      fn name(&self) -> &str { "rag_search" }
      async fn execute(&self, input: Value, context: &ToolUseContext) -> ToolResult {
          let query = input["query"].as_str().ok_or("query required")?;
          let top_k = input["top_k"].as_u64().unwrap_or(8) as usize;
          let hits = self.basemind.query_rag(query, top_k).await?;
          ToolResult::json(hits) // hits: [{chunk, source_doc, score, entity_ids}]
      }
  }
  ```
- [ ] Register in `assembly/core/src/agentic/tools/registry.rs` under `cfg(feature = "tools-rag")`
- [ ] Add `tools-rag` feature to `assembly/core/Cargo.toml` (depends on `basemind` feature)
- [ ] Verify tool appears in `get_all_tools()` and works in agent loop