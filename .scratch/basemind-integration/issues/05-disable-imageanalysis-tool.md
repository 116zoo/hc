# 05: Disable ImageAnalysis tool group

**What to build:** Remove `ImageAnalysis` from the enabled tool feature groups for the basemind fork. This is Option B from the spec — prevents silent PII leaks through unredacted image OCR until Basemind OCR is validated.

**Blocked by:** 01 (crate skeleton)

**Status:** ready-for-agent

- [ ] In `execution/tool-provider-groups/src/lib.rs`:
  - Remove `ToolPackFeatureGroup::ImageAnalysis` from the `enabled_feature_groups()` return when `cfg(feature = "basemind")`
  - Or add a new feature `tools-basemind-no-image` that excludes it
- [ ] Verify `view_image` and `analyze_image` tools are not registered when basemind feature is active
- [ ] Add comment explaining this is temporary until Basemind OCR is validated (Option A migration path)