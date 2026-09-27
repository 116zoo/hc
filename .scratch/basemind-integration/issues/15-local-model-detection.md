# 15: Local model detection (TS + Rust)

**What to build:** Detection logic to identify local model endpoints (Ollama, LM Studio, vLLM) so pseudonymization can be skipped for them. Implemented in both TypeScript (Web UI) and Rust (Tauri backend).

**Blocked by:** 14 (settings schema for toggles)

**Status:** ready-for-agent

- [ ] Create `src/web-ui/src/infrastructure/config/services/localModelDetection.ts`:
  ```typescript
  export function isLocalModelBaseUrl(baseUrl: string): boolean {
    const url = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) return true;
    const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4) {
      const [, a, b] = ipv4.map(Number);
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
    }
    if (hostname === 'host.docker.internal' || hostname.endsWith('.local')) return true;
    return false;
  }
  
  export async function shouldPseudonymize(sessionId: string): Promise<boolean> {
    const baseUrl = await getActiveModelBaseUrl(sessionId);
    if (!baseUrl) return true;
    return !isLocalModelBaseUrl(baseUrl);
  }
  ```
- [ ] Create `basemind-integration/src/local_model_detection.rs` with identical logic in Rust
- [ ] Export `is_local_model_base_url()` from `basemind-integration` crate