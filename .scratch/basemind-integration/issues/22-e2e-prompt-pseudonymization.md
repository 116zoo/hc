# 22: E2E verification: prompt pseudonymization

**What to build:** End-to-end test covering user prompt pseudonymization for cloud vs local models, and history rehydration.

**Blocked by:** 17 (dialog turn interception), 18 (settings toggles)

**Status:** ready-for-agent

- [ ] Create `pnpm --filter web-ui test:e2e prompt-pseudonymization` test:
  - **Cloud model path:**
    - Configure OpenAI/Anthropic model
    - Type prompt: "Jean Dupont lives at 123 Main St, IBAN FR1420041010050500013M02606"
    - Submit → verify agent receives pseudonymized: "[PERSON_1] lives at [ADDRESS_1], IBAN [IBAN_1]"
    - Verify UI displays original prompt in conversation history
    - Verify `basemind_reveal_entity` works on entity IDs from prompt
  - **Local model path:**
    - Configure Ollama model (base_url = http://localhost:11434/v1)
    - Type same prompt → verify agent receives RAW text (no pseudonymization)
    - Verify UI displays original prompt
  - **Forced local pseudonymization:**
    - Enable "Also pseudonymize for local models" setting
    - Submit to Ollama → verify pseudonymized text sent
  - **History rehydration:**
    - Close/reopen session → verify conversation history shows original values
    - Switch between cloud/local models in same session → each respects its setting
- [ ] Test with multiple entity types: PERSON, DATE, EMAIL, PHONE, IBAN, ORG
- [ ] Test rapid successive messages (no vault corruption)