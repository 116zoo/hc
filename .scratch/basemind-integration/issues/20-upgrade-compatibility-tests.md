# 20: Upgrade compatibility tests

**What to build:** Legacy deserialization tests, old-payload round-trip tests, and canary test for upstream signature stability.

**Blocked by:** 14 (config schema), 16 (vault format)

**Status:** ready-for-agent

- [ ] In `basemind-integration/tests/upgrade_compat.rs`:
  ```rust
  #[test]
  fn legacy_basemind_config_deserialization() {
      // Old config without pseudonymize_prompts field should deserialize with defaults
      let old_json = r#"{ "enabled": true, "auto_download_models": true }"#;
      let config: BasemindConfig = serde_json::from_str(old_json).unwrap();
      assert!(config.pseudonymize_prompts); // default true
      assert!(!config.pseudonymize_local_models); // default false
  }
  
  #[test]
  fn session_vault_roundtrip() {
      let vault = SessionVault::new(temp_dir);
      let map = HashMap::from([("[PERSON_1]".to_string(), "Jean Dupont".to_string())]);
      vault.encrypt_and_store("session:test:prompt_rehydration", &map).await.unwrap();
      let loaded = vault.decrypt_and_load("session:test:prompt_rehydration").await.unwrap();
      assert_eq!(loaded.get("[PERSON_1]"), Some(&"Jean Dupont".to_string()));
  }
  ```
- [ ] Canary test for upstream signature stability:
  ```rust
  #[test]
  fn upstream_conversion_signature_unchanged() {
      fn _assert_signature(_f: fn(Vec<u8>, String) -> futures::future::BoxFuture<'static, 
          Result<tool_runtime::fs::document::ConvertedDocument, tool_runtime::fs::document::DocumentConversionError>>) {}
  }
  ```
  - Fails at **compile time** if upstream changes signature
- [ ] Test cross-version command compatibility:
  - Old `basemind_reveal_entity` payload (without `workspace_id`) still works
  - New fields are optional with defaults