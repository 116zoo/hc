# 08: TypeScript BasemindAPI service + MarkdownRenderer sanitization

**What to build:** TypeScript service API for Web UI to call Tauri commands, plus sanitization schema extension in MarkdownRenderer to allow PII entity spans.

**Blocked by:** 07 (Tauri commands)

**Status:** ready-for-agent

- [ ] Create `src/web-ui/src/infrastructure/api/service-api/BasemindAPI.ts`:
  ```typescript
  export interface RevealEntityRequest { workspaceId?: string; entityId: string }
  export interface RedactedDocumentResponse { markdown: string; entities: RedactedEntity[]; sourceFormat: string }
  
  class BasemindAPI {
    async revealEntity(entityId: string, workspaceId?: string): Promise<string>
    async readRedactedDocument(filePath: string, workspaceId?: string): Promise<RedactedDocumentResponse>
  }
  export const basemindAPI = new BasemindAPI()
  ```
- [ ] Export in `src/web-ui/src/infrastructure/api/index.ts`
- [ ] In `src/web-ui/src/infrastructure/markdown/MarkdownRenderer.tsx`:
  - Extend `sanitizeSchema.attributes.span` to allow `className`, `data-entity-type`, `data-entity-id`
  - Add custom `span` renderer in `components` memo that detects `data-entity-*` props and renders `RevealableEntityBadge`