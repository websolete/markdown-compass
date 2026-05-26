# Markdown Compass Debugging and Troubleshooting Guide

## Preview Model

Markdown Compass now routes preview opens through VS Code's built-in markdown preview only.

- There is no extension-owned enhanced preview or preview-specific debug toggle.
- Preview rendering, tab behavior, and theme application are controlled by VS Code's native markdown preview.
- CFML fenced code-block highlighting is handled by `markdown-cfml-syntax`, not by this extension.
- If you need historical guidance for older releases that still used the retired enhanced preview, see `docs/archive/ENHANCED-PREVIEW-DEBUG.md`.

## Useful Checks

1. Open the target file and run `Markdown: Open Preview` to confirm that VS Code's native preview works outside the tree view.
2. Use `Developer: Toggle Developer Tools` if preview behavior or console errors need inspection.
3. Review `markdown.preview.openMarkdownLinks` and `markdown.links.openLocation` when link-opening behavior is the issue.
4. Reload the VS Code window after installing or updating the extension if tree-view preview routing looks stale.

## Static Validation Tools

The extension includes static validation scripts that can be run to verify the internal consistency of the extension.

### Command Registration Validation

Run the static command validation script:

```bash
cd /path/to/markdown-compass
node tests/development/static-command-validation.js
```

This validates:
- Command registration in code files
- Command definitions in package.json
- Command implementation presence
- Tree item command configuration

## Common Issues and Solutions

### 1. Preview Not Rendering

**Symptoms:** Blank preview, the wrong tab opens, or VS Code shows a native markdown preview error.

**Checks:**
1. Confirm the file opens with `Markdown: Open Preview` directly from VS Code.
2. Check Developer Tools for native markdown preview errors.
3. Verify the markdown file is accessible inside the current workspace.

**Potential Solutions:**
- Restart VS Code or reload the window.
- Confirm the built-in Markdown extension remains enabled.
- Re-run the extension compile/test checks if you are debugging a local development build.

### 2. Theme Not Applied Correctly

**Symptoms:** Preview colors or typography do not match the active VS Code theme.

**Checks:**
1. Switch themes in VS Code and confirm whether the native markdown preview updates.
2. Inspect custom VS Code markdown preview settings that may override defaults.

**Potential Solutions:**
- Reset conflicting `markdown.preview.*` settings.
- Test with the default VS Code theme to separate native-preview issues from theme-customization issues.

### 3. CFML Syntax Highlighting Issues

**Symptoms:** CFML fenced code blocks are not highlighted as expected in markdown previews.

**Checks:**
1. Verify the fenced block language is declared correctly, for example `cfml`.
2. Confirm the `markdown-cfml-syntax` extension is installed and enabled.

**Potential Solutions:**
- Install or re-enable `markdown-cfml-syntax`.
- Reduce the repro to a minimal fenced block to confirm whether the issue belongs to VS Code preview rendering or the CFML syntax extension.

## Reporting Issues

When reporting preview problems, include the following so native-preview issues can be reproduced quickly:

- A minimal markdown sample or repro file
- The VS Code version in use
- Relevant `markdown.preview.*` or markdown-link settings
- Any console errors from `Developer: Toggle Developer Tools`
