# Native Preview Navigation Validation

> Historical note: This file is retained as the Phase 1 preview-modernization audit artifact. References below to `markdownCompass.previewMode` and `Open Enhanced Preview` describe the transition state used during the spike, not the current native-only runtime.

This document is the bounded validation artifact for the native preview spike introduced in Phase 1.

## Objective

Validate that `markdownCompass.previewMode = native` can be exercised without removing the enhanced-preview fallback, and record the exact outcome for each rendered-navigation scenario before the next cutover work order begins.

## Settings Prep

1. Set `markdownCompass.previewMode` to `native`.
2. For the recorded executor validation pass below, use `markdown.preview.openMarkdownLinks = inPreview` and `markdown.links.openLocation = currentGroup`.
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
| Tree open | Set preview mode to `native`, then click a markdown file in the Markdown Compass tree or Favorites view. | The file opens in VS Code's native markdown preview and the enhanced preview remains available through `Open Enhanced Preview`. |
| Relative markdown links | Open this file in native preview and activate [README relative link](../README.md) from the rendered preview. | The preview follows the relative markdown link according to the fixed markdown link settings chosen above. |
| Cross-file fragments | From native preview, activate [README Purpose heading](../README.md#purpose). | The preview opens `README.md` and lands at the `Purpose` heading or the closest native-fragment target VS Code supports. |
| Same-file fragments | From native preview, activate [Jump to same-file target](#same-file-target). | The preview stays on this file and moves to the `Same-file Target` section. |
| Locked preview behavior | Lock the native preview tab, then repeat the tree-open and cross-file fragment scenarios. | The locked preview remains stable and the navigation behavior is consistent with VS Code's lock semantics. |

## Pass/Fail Record

Record the actual outcome here before starting the next cutover work order.

| Scenario | Outcome | Evidence / Notes |
| --- | --- | --- |
| Automated routing smoke test | PASS | `test/native-preview-routing.test.js` verifies the default enhanced route plus native dispatch to `markdown.showPreview` and `markdown.showPreviewToSide`, including fragment URIs. |
| Tree open | PASS | `test/native-preview-behavior.test.js` validates the `markdown-compass.previewMarkdownFile` command path in `previewMode = native` and confirms VS Code opens a native markdown preview tab for the requested file. |
| Relative markdown links | PASS | `test/native-preview-behavior.test.js` fixes `markdown.preview.openMarkdownLinks = inPreview` and `markdown.links.openLocation = currentGroup`, then validates the native preview opens the relative-link target in the current preview group. Treat this as extension-host proxy coverage for target resolution, not DOM-level proof of rendered-link activation. |
| Cross-file fragments | PASS | `test/native-preview-behavior.test.js` validates that opening the cross-file fragment target URI (`native-preview-target.md#purpose`) succeeds in the native preview under the fixed link settings. Treat this as extension-host proxy coverage for fragment-target resolution, not DOM-level proof of rendered fragment activation. |
| Same-file fragments | PASS | `test/native-preview-behavior.test.js` validates that opening the same-file fragment URI keeps the native preview on the source document under the fixed link settings. Treat this as extension-host proxy coverage for fragment-target resolution, not DOM-level proof of rendered fragment activation. |
| Locked preview behavior | PASS | `test/native-preview-behavior.test.js` validates that `markdown.showLockedPreviewToSide` keeps the locked source preview open while a second native markdown preview target opens, matching VS Code's lock semantics. |

## Same-file Target

This section is the same-file fragment target for the validation matrix.

## Session Record

- Automated smoke status: PASS after the Phase 1 routing abstraction landed.
- Extension-host validation status: PASS with `markdown.preview.openMarkdownLinks = inPreview` and `markdown.links.openLocation = currentGroup`.
- Gate status at executor close: PASS for extension-host proxy coverage. No `NOT RUN MANUALLY` rows remain in the pass/fail record, but rendered DOM click behavior is still not directly automated here.
- Follow-up note: rendered preview link clicks remain VS Code-owned behavior; the recorded PASS outcomes above are based on extension-host preview-target validation rather than DOM-level click automation.