# Markdown Navigator

Markdown Navigator turns all the Markdown files in your workspace into a unified documentation hub.

## Purpose

Provide an easy to use and intuitive way to navigate and preview all the Markdown (.md) files in the current workspace.  If you prefer to document your code via Markdown, and especially if you have these files peppered throughout your codebase, this is a valuable tool.

## Features

- **Focused Documentation View**: Shows only markdown files and directories containing markdown files
- **Preview on Click**: Single-click on any markdown file to open it in preview mode
- **Document Headers View**: Displays header hierarchy of the currently previewed markdown file
- **Navigate Headers**: Click on headers to scroll the markdown preview to the selected section
- **Copy Header Links**: Easily copy markdown links to headers for cross-referencing
- **Context Menu Options**: Right-click to open files in source/edit mode or preview mode
- **Hierarchical Display**: Matches the directory structure of your workspace (displays only those folders containing Markdown files)
- **Collapsible Sections**: Ability to collapse directories for better organization
- **Toggle .gitignore Filtering**: Enable or disable .gitignore filtering with one click
- **Search and Filter**: Find markdown files by name or content using the built-in search
- **File Statistics**: View comprehensive statistics about your markdown documentation

## Usage

1. Click on the Markdown Navigator icon in the activity bar (sidebar)
2. Browse through the "Documentation Files" tree to find markdown files
3. Click once on a markdown file to open it in preview mode
4. The "Current Document" panel will automatically display the header structure of the previewed file
5. Click on any header in the headers view to scroll directly to that section in the markdown preview
6. Right-click on any header to copy a markdown link to it for cross-referencing
7. Use the search button to filter files by name or content
8. Use the refresh button to update the view if files are added or changed
9. Click on the filter icon to toggle .gitignore filtering on/off
10. Use the statistics button to view comprehensive information about your markdown files

## Header Navigation

When you click on a header in the "Current Document" view, the extension attempts to scroll the preview to that header using multiple methods:

1. **Fragment Navigation**: Uses VS Code's built-in anchor system (most reliable)
2. **Alternative Anchors**: Tries different anchor formats if the first fails
3. **Content-based Scrolling**: Provides approximate location information
4. **Fallback**: Opens the preview with user guidance

If automatic scrolling fails, the extension will provide helpful information about where to find the header manually.

## Requirements

No special requirements or dependencies.

## Extension Settings

This extension doesn't add any VS Code settings at this time.

## Known Issues

- Header navigation may not work perfectly in all cases due to VS Code's preview implementation
- Some markdown files with complex formatting may not display all headers correctly
- Search functionality requires files to be accessible (respects .gitignore when enabled)

---
