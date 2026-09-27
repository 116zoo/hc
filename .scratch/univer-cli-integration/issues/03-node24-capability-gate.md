# node24-capability-gate

`Type: grilling`
`Status: resolved`

## Question

What is the exact contract of the Node >=24 capability gate? Where detection runs (startup vs on-demand vs `univer doctor`), what happens when node is absent or <24 (the precise unsupported state shown in desktop UI, the agent's reply when asked to create/edit a document, and whether the builtin skill entry point is hidden or answers with the loud failure), whether the user gets remediation guidance, and which config/state record marks the capability as unavailable so every surface derives the same answer.

## Answer
Rust-side capability status record (`available | unsupported-node | not-installed | error`), derived on-demand + cached (invalidated by ticket 04's bootstrap, policy change, or explicit Recheck), with mode/disable semantics riding the existing `external_integration_policy` shape; UI and agent both read this one projection.

- Desktop: entry points visible but gated — disabled with reason + remediation ("Requires Node 24+"), Recheck action.
- Agent: skill stays present; its first step returns the shared record state verbatim so the relay is deterministic and matches the UI.
- Discovery: reuse `ManagedRuntimeResolver` (explicit path -> system PATH -> managed runtime); gate on resolved node >=24. Remediation: install Node 24+ or point settings at a Node 24 binary, then Recheck.
- Provisioning a managed Node 24 is an upgrade path, not part of this contract.
