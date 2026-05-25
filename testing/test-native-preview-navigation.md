# Native Preview Navigation Validation

This document is the bounded validation artifact for the native preview spike introduced in Phase 1.

## Objective

Validate that `markdownNavigator.previewMode = native` can be exercised without removing the enhanced-preview fallback, and record the exact outcome for each rendered-navigation scenario before the next cutover work order begins.

## Settings Prep

1. Set `markdownNavigator.previewMode` to `native`.
2. Choose and record the current values of `markdown.preview.openMarkdownLinks` and `markdown.links.openLocation` before running the scenarios below.
3. Keep those markdown settings fixed for the whole pass so failures are attributable to routing, not configuration drift.
4. Before the locked-preview scenario, lock the native preview editor using the preview lock action in the preview tab or the corresponding command palette action.

## Fixture Links

- Relative markdown link: [README relative link](../README.md)
- Cross-file fragment link: [README Purpose heading](../README.md#purpose)
- Same-file fragment link: [Jump to same-file target](#same-file-target)
- Secondary markdown target for repeated link checks: [Enhanced Preview Header Navigation Test](test-header-navigation.md)

## Manual Validation Matrix

| Scenario | Steps | Expected Result |
| --- | --- | --- |
| Tree open | Set preview mode to `native`, then click a markdown file in the Markdown Navigator tree or Favorites view. | The file opens in VS Code's native markdown preview and the enhanced preview remains available through `Open Enhanced Preview`. |
| Relative markdown links | Open this file in native preview and activate [README relative link](../README.md) from the rendered preview. | The preview follows the relative markdown link according to the fixed markdown link settings chosen above. |
| Cross-file fragments | From native preview, activate [README Purpose heading](../README.md#purpose). | The preview opens `README.md` and lands at the `Purpose` heading or the closest native-fragment target VS Code supports. |
| Same-file fragments | From native preview, activate [Jump to same-file target](#same-file-target). | The preview stays on this file and moves to the `Same-file Target` section. |
| Locked preview behavior | Lock the native preview tab, then repeat the tree-open and cross-file fragment scenarios. | The locked preview remains stable and the navigation behavior is consistent with VS Code's lock semantics. |

## Pass/Fail Record

Record the actual outcome here before starting the next cutover work order.

| Scenario | Outcome | Evidence / Notes |
| --- | --- | --- |
| Automated routing smoke test | PASS | `test/native-preview-routing.test.js` verifies the default enhanced route plus native dispatch to `markdown.showPreview` and `markdown.showPreviewToSide`, including fragment URIs. |
| Tree open | NOT RUN MANUALLY | Interactive native preview rendering was not exercised in this executor session; run the tree-open scenario in an extension host window and replace this note with PASS or FAIL. |
| Relative markdown links | NOT RUN MANUALLY | Use [README relative link](../README.md) in rendered native preview with the fixed markdown link settings recorded above. |
| Cross-file fragments | NOT RUN MANUALLY | Use [README Purpose heading](../README.md#purpose) in rendered native preview and record whether the preview lands at `## Purpose`. |
| Same-file fragments | NOT RUN MANUALLY | Use [Jump to same-file target](#same-file-target) in rendered native preview and record whether the preview scrolls to the section below. |
| Locked preview behavior | NOT RUN MANUALLY | Lock the native preview tab first, then repeat tree-open and cross-file fragment checks and record the observed lock behavior. |

## Same-file Target

This section is the same-file fragment target for the validation matrix.

## Session Record

- Automated smoke status: PASS after the Phase 1 routing abstraction landed.
- Manual scenario status at executor close: NOT RUN MANUALLY.
- Follow-up requirement: populate every manual row above with PASS or FAIL before beginning `WORK_ORDER-markdown-navigator-preview-phase-2-native-cutover.md`.