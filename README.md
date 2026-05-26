# Markdown Navigator

Markdown Navigator turns all the Markdown files in your workspace into a unified documentation hub.

## Purpose

Provide an easy to use and intuitive way to navigate and preview all the Markdown (.md) files in the current workspace.  If you prefer to document your code via Markdown, and especially if you have these files peppered throughout your codebase, this is a valuable tool.

## Features

- **Focused Documentation View**: Shows only markdown files and directories containing markdown files
- **Preview on Click**: Single-click on any markdown file to open VS Code's native markdown preview by default
- **Document Headers View**: Displays header hierarchy of the currently previewed markdown file
- **Navigate Headers**: Click on headers to scroll the markdown preview to the selected section
- **Copy Header Links**: Easily copy markdown links to headers for cross-referencing
- **Context Menu Options**: Right-click to open files in source/edit mode or preview mode
- **Hierarchical Display**: Matches the directory structure of your workspace (displays only those folders containing Markdown files)
- **Collapsible Sections**: Ability to collapse directories for better organization
- **Toggle .gitignore Filtering**: Enable or disable .gitignore filtering with one click
- **Search and Filter**: Fuzzy-match markdown folder names, file names, and markdown headers using the built-in tree filter
- **File Statistics**: View comprehensive statistics about your markdown documentation

## Usage

1. Click on the Markdown Navigator icon in the activity bar (sidebar)
2. Browse through the "Markdown Files" tree to find markdown files
3. Click once on a markdown file to open it in VS Code's native markdown preview
4. The "Current Document" panel will automatically display the header structure of the previewed file
5. Click on any header in the headers view to target that section in the markdown preview
6. Right-click on any header to copy a markdown link to it for cross-referencing
7. Use the search button to filter the tree by folder name, markdown file name, or markdown header
8. Use the refresh button to update the view if files are added or changed
9. Click on the filter icon to toggle .gitignore filtering on/off
10. Use the statistics button to view comprehensive information about your markdown files

## Search Scope

The Markdown Files search is a live tree filter, not a separate full-text index. It currently matches:

- directory names shown in the Markdown Files tree
- markdown file names ending in `.md`
- markdown headers extracted from those files (`#` through `######`)

It does not currently search paragraph/body text, link URLs, or non-Markdown files.

When `.gitignore` filtering is enabled, ignored paths are excluded from both the tree and search results.

## Header Navigation

When you click on a header in the "Current Document" view, the extension targets VS Code's native markdown preview and attempts to move the preview to that heading using fragment-based navigation:

1. **Fragment Navigation**: Uses VS Code's built-in anchor system (most reliable)
2. **Alternative Anchors**: Tries different anchor formats if the first fragment does not land correctly
3. **Fallback**: Reopens the preview with search guidance if fragment targeting cannot resolve the heading

If automatic scrolling fails, the extension will provide the heading text and search guidance instead of silently leaving the preview at the wrong location.

## Requirements

No special requirements or dependencies.

## Extension Settings

Markdown Navigator contributes one native-preview safety setting:

- `markdownNavigator.safeLinkSuppression.enabled` (default: `true`) renders definitively broken local Markdown file links and broken cross-file Markdown heading fragments as inert styled text in VS Code's native Markdown preview.

Anchor-only links, valid local links, external URLs, and local non-Markdown fragments that cannot be validated are left unchanged.

## Preview Styling

Markdown Navigator relies on VS Code's built-in markdown preview for rendering and styling.

- Preview colors, typography, and code-block backgrounds come from VS Code's native markdown preview.
- The extension adds a small native preview stylesheet so suppressed broken local links render as neutral inert text instead of clickable anchors.
- The safe-link behavior applies to all native Markdown previews while Markdown Navigator is active.
- Extension-owned CFML syntax coloring has been removed from this extension.
- For CFML fenced code blocks in markdown, use the dedicated `markdown-cfml-syntax` extension.

## Known Issues

- Header navigation may not work perfectly in all cases due to VS Code's preview implementation
- Some markdown files with complex formatting may not display all headers correctly
- Search functionality requires files to be accessible and only indexes the Markdown tree surface described above (respects .gitignore when enabled)

---
