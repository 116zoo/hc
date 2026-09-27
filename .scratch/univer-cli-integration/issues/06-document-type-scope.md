# document-type-scope

`Type: grilling`
`Status: claimed`
`Blocked by: 09`

## Question

Which univer content types are in the contract's v1 scope — Sheet, Doc, Slide, Base, Board — given the user goal "viewing documents, editing and creating"? Consider which types map to existing workspace file types (xlsx/csv, docx, pptx), which have no office counterpart (Base, Board), import/export support (Board has none), and how a v1 scope keeps the contract decidable now while leaving the rest as named future scope rather than fog.

## Answer


## Answer (Q1)

(a) Sheet, Doc, Slide — Sheet maps to xlsx, Doc to docx, Slide to pptx, each with direct import/export support. Board (no file export) and Base (field‑model tables) are deferred to future scope. PDF import for Doc is supported via univer-cli as an optional add‑on; it does not affect the v1 scope decision.

The three‑type set keeps the contract decidable now while leaving Board/Base as named future scope.
