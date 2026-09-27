# embedding-mechanism

`Type: grilling`
`Status: open`

## Question

Which embedding mechanism does the contract commit to for the desktop human surface? Candidates from ticket 01's research: (a) plain iframe pointing at `http://127.0.0.1:<gateway>/…?mode=embedded&scope=…&editable=…`, (b) same-origin proxy through the dev/desktop server forwarding `/uf/*` HTTP+WS with prefix stripping (the pattern DreamNum's own cowork test uses), (c) the `@univerjs-pro/cowork` React component behind a proxy (Pro-licensed — needs ticket 02's terms confirmed for our use). Decide port discovery (`univer daemon status --json` schema drift between versions), the Tauri webview empirical check, and what the fallback stance is if the chosen mechanism fails at runtime.

## Answer
