# node24-provisioning

`Type: grilling`
`Status: open`

## Question

How does a managed Node 24 runtime ship with the product for univer? Covers: where provisioning lands (existing `ManagedRuntimeResolver` `runtime_root/node/current` component), install-time vs first-use download vs installer-bundled (size per platform), how the capability gate (ticket 03) switches from "remediate yourself" to "we provision it", platform/matrix coverage and what happens when the download fails or is offline, version pin/update policy for the managed node, and how this stays separate from the dev/CI engines baseline (still >=22.12).

## Answer
