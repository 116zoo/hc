# 16: PromptPseudonymizer + SessionVault

**What to build:** Core pseudonymization logic in `prompt_pseudonym.rs` and per-session encrypted vault in `session_vault.rs`. Uses Basemind's PII detection pipeline and vault encryption.

**Blocked by:** 02 (BasemindClient), 15 (local model detection)

**Status:** ready-for-agent

- [ ] In `basemind-integration/src/prompt_pseudonym.rs`:
  ```rust
  pub struct PromptPseudonymizer {
      basemind_client: Arc<BasemindClient>,
      vault: Arc<SessionVault>,
  }
  
  impl PromptPseudonymizer {
      pub async fn pseudonymize(&self, text: &str, session_id: &str) 
          -> Result<(String, HashMap<String, String>), PseudonymError> {
          let findings = self.basemind_client.detect_pii(text).await?;
          let mut rehydration_map = HashMap::new();
          let mut pseudonymized = text.to_string();
          let mut sorted = findings;
          sorted.sort_by(|a, b| b.start.cmp(&a.start));
          for (idx, finding) in sorted.iter().enumerate() {
              let token = format!("[{}_{}]", finding.category.to_uppercase(), idx + 1);
              let original = &text[finding.start as usize..finding.end as usize];
              rehydration_map.insert(token.clone(), original.to_string());
              pseudonymized.replace_range(finding.start as usize..finding.end as usize, &token);
          }
          let vault_key = format!("session:{}:prompt_rehydration", session_id);
          self.vault.encrypt_and_store(&vault_key, &rehydration_map).await?;
          Ok((pseudonymized, rehydration_map))
      }
      
      pub async fn rehydrate(&self, text: &str, session_id: &str) -> Result<String, PseudonymError> {
          let vault_key = format!("session:{}:prompt_rehydration", session_id);
          let map = self.vault.decrypt_and_load(&vault_key).await?;
          let mut result = text.to_string();
          for token in map.keys().sorted_by(|a, b| b.len().cmp(&a.len())) {
              if let Some(original) = map.get(token) {
                  result = result.replace(token, original);
              }
          }
          Ok(result)
      }
  }
  ```
- [ ] In `basemind-integration/src/session_vault.rs`:
  ```rust
  pub struct SessionVault { vault_path: PathBuf }
  
  impl SessionVault {
      pub async fn encrypt_and_store(&self, key: &str, map: &HashMap<String, String>) -> Result<(), VaultError> {
          let encrypted = vault_encrypt(map)?;
          let path = self.vault_path.join(format!("{}.vault", key.replace(':', "_")));
          tokio::fs::write(path, encrypted).await?;
          Ok(())
      }
      
      pub async fn decrypt_and_load(&self, key: &str) -> Result<HashMap<String, String>, VaultError> {
          let path = self.vault_path.join(format!("{}.vault", key.replace(':', "_")));
          let encrypted = tokio::fs::read_to_string(path).await?;
          vault_decrypt(&encrypted)
      }
      
      pub async fn delete(&self, key: &str) -> Result<(), VaultError> { ... }
  }
  ```
- [ ] Use Basemind's existing `vault_encrypt`/`vault_decrypt` (AES-GCM)
- [ ] Vault path: `<session_storage>/.basemind_prompt_vault/<session_id>.vault`
- [ ] Auto-cleanup on session delete