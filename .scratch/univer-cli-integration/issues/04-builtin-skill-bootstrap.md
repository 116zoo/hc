# builtin-skill-bootstrap

`Type: grilling`
`Status: open`
`Blocked by: 09`

## Question

How does the builtin `univer` skill reach the **bundled, Apache-only univer-cli binary** that ships with the product (destination redraw: no npx-at-runtime bootstrap)? Covers: what the skill's first steps are (capability-gate read per ticket 03, locate shipped CLI + managed Node 24, invoke), whether upstream operational skills still ship inside the bundled CLI and how the wrapper points at them, what the skill does when the bundle is absent (dev builds, slim installs) — loud unsupported per ticket 03, never a silent npx fallback that reintroduces Pro packages, where install/build state is recorded so gate and skill agree, and how skill content stays version-matched to the bundled CLI across product releases (bundle pins both together).

Constraint from ticket 02: never vendor or rebrand code without rights; Apache/MIT packages only, no `@univerjs-pro`, no rebranding. Feasibility precondition is ticket 09 — if the CLI cannot run OSS-only, this ticket's shape changes.

## Answer
