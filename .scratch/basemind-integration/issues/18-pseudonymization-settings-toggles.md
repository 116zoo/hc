# 18: Pseudonymization settings toggles

**What to build:** Two switches in the Basemind settings page for pseudonymization control.

**Blocked by:** 14 (Basemind settings page), 15 (local model detection)

**Status:** ready-for-agent

- [ ] Extend `BasemindConfig` in Rust:
  ```rust
  pub struct BasemindConfig {
      // ... existing fields
      pub pseudonymize_prompts: bool,           // master toggle, default true
      pub pseudonymize_local_models: bool,      // override for local, default false
  }
  ```
- [ ] In `src/web-ui/src/infrastructure/config/components/RuntimeSettingsPages.tsx` Basemind section:
  ```tsx
  <SettingRow>
    <SettingLabel>Pseudonymize user prompts</SettingLabel>
    <SettingDescription>
      Replace PII in your prompts before sending to cloud models. 
      Local models (Ollama, LM Studio, etc.) are excluded by default.
    </SettingDescription>
    <Switch checked={settings.pseudonymize_prompts} onChange={v => updateSettings({ pseudonymize_prompts: v })} />
  </SettingRow>
  
  <SettingRow>
    <SettingLabel>Also pseudonymize for local models</SettingLabel>
    <SettingDescription>
      When enabled, pseudonymization runs even for local models (Ollama, LM Studio). 
      Normally not needed since data stays on your machine.
    </SettingDescription>
    <Switch 
      checked={settings.pseudonymize_local_models} 
      onChange={v => updateSettings({ pseudonymize_local_models: v })} 
      disabled={!settings.pseudonymize_prompts}
    />
  </SettingRow>
  ```
- [ ] Defaults: `pseudonymize_prompts = true`, `pseudonymize_local_models = false`
- [ ] Wire to backend config persistence