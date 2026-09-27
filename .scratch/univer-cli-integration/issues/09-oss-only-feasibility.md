# oss-only-feasibility

`Type: research`
`Status: open`

## Question

Can univer-cli actually run with every `@univerjs-pro/*` and private `@univer-cli/*` dependency excluded, leaving only Apache-2.0/MIT packages? From primary sources (univer-cli repo manifests `apps/cli/package.json` + pnpm-lock, source imports, docs): enumerate which packages the CLI imports at startup vs per feature; which features (viewer, gateway, daemon, worktrees/History/diff, execute, import/export, screenshot/print-pdf, skills) require Pro; whether a documented OSS-only or community build mode exists; what breaks at boot when Pro is stripped; and whether the Apache `@univerjs/*` SDK alone can be assembled into a usable viewer/editor (e.g. via @univerjs/preset or a web build). Deliver a feature-survival matrix: works / degraded / gone / unknown.

## Answer
