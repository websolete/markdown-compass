# Enhanced Preview Debugging Guide

## Using Debug Mode

### Toggling Debug Mode
- Use the command `markdown-navigator.toggleEnhancedPreviewDebug` to toggle debug mode
- When enabled, a debug panel will appear at the bottom-right of the Enhanced Preview showing diagnostic information
- Toggle again to hide the debug panel
- You can also bind a keyboard shortcut (recommended: Ctrl+Shift+Alt+D) to this command

### Debug Features
- Real-time logging of enhanced preview operations
- Timestamps for all events to help diagnose timing issues
- Error details shown directly in the preview
- Performance metrics for content processing operations
- Debug information is stored in memory for the current session

### Debug Panel UI
The debug panel appears as a semi-transparent overlay in the bottom-right corner of the preview:
- Dark background with high-contrast text for readability
- Scrollable for long logs
- Timestamps for all entries
- Auto-updates when new debug information is added
- Toggle on/off without losing debug history

### 2. Native VS Code Styling In Enhanced Preview
- **Current Behavior**: The enhanced preview now uses VS Code theme variables from its base webview stylesheet instead of loading extension-owned theme CSS files.
- **Implication**:
   - Theme changes should follow the active VS Code color theme automatically.
   - There is no separate preview-theme selection flow to debug anymore.
   - Extension-owned CFML syntax coloring is intentionally absent; that concern moved to the dedicated `markdown-cfml-syntax` extension.

### 3. Enhanced Preview Opening in Wrong Panel
- **Root Cause**: Hardcoded ViewColumn value was not using the active editor column
- **Fix**:
  - Replaced hardcoded `ViewColumn.Two` with `ViewColumn.Active`
  - Enhanced to use `vscode.window.activeTextEditor.viewColumn` when available
  - Added better debug logging for viewColumn determination
  - Modified both panel creation and panel reveal to use the same viewColumn determination logic
  - **Enhanced with explicit ViewColumn control**:
    - Changed panel creation to use an options object with explicit `viewColumn: ViewColumn.Active`
    - Added preserveFocus parameter to control whether preview steals focus
    - Simplified column handling logic to always use Active column for consistency

### 4. Enhanced Preview Failing to Load After Closing a Previous One
- **Root Cause**: The `isDisposed` flag wasn't being properly reset
- **Fix**:
  - Reset `isDisposed` flag in multiple places:
    1. When opening a preview
    2. When creating a new panel
    3. When attempting error recovery
  - Added loading indicator to show while content loads
  - Added better error recovery to handle cases where panel becomes invalid during processing
  - Implemented more explicit state checking throughout the code

## Implementation Checklist

- [x] Debug mode toggle
- [x] Status bar indicator for debug mode
- [x] Align preview styling with VS Code-native theme variables
- [x] Fix preview panel opening in wrong panel/column 
- [x] Fix preview failing to load after closing previous one

## Key Code Patterns

### Native Theme Token Styling
```javascript
body {
   color: var(--vscode-editor-foreground);
   background: var(--vscode-editor-background);
   font-family: var(--vscode-font-family);
}
```

### ViewColumn Determination
```javascript
// Get the active editor's column if available
const viewColumn = vscode.window.activeTextEditor 
    ? vscode.window.activeTextEditor.viewColumn 
    : vscode.ViewColumn.Active;
```

### State Reset Pattern
```javascript
// Reset the disposed flag whenever a preview is requested
if (this.isDisposed) {
    this.addDebugInfo('Provider was previously disposed, resetting state');
    this.isDisposed = false;
}
```

## Testing Notes

For effective testing of these fixes:

1. **Theme Changes**: 
   - Open a markdown file with an enhanced preview
   - Change the active VS Code color theme
   - Verify the preview follows the editor theme without any extension-specific theme selection step

2. **View Column Behavior**:
   - Open a markdown file in one column
   - Open the enhanced preview
   - Verify it opens in the same column
   - Split the editor and try different column combinations

3. **Re-opening After Closing**:
   - Open a markdown preview
   - Close it
   - Try to reopen it
   - Verify it loads properly without errors

4. **Debug Mode**:
   - Use the keyboard shortcut (Ctrl+Shift+Alt+D) to toggle debug mode
   - Verify the status bar indicator appears/disappears
   - Check the console for debug messages when enabled

## Known Limitations

- Preview initialization has a small delay (100ms) to ensure the panel is ready

## Potential Future Enhancements

1. **Theme Hot-Reload Optimization**
   - Instead of regenerating the entire HTML content when theme changes, consider using a CSS link element with an updated query parameter
   - This would make theme changes even faster and avoid full page reloads

2. **WebView State Persistence**
   - Store scroll position before theme changes and restore it afterward
   - Save user preferences per document (like expanded sections)

3. **Better Error Recovery**
   - Add a "Reload Preview" button in the error page
   - Implement automatic retry with exponential backoff for transient errors

4. **Performance Optimizations**
   - Consider caching rendered HTML for recently viewed documents
   - Use incremental updates for large documents

## Edge Cases to Test

1. **Non-Existent Theme Files**: What happens when a configured theme doesn't have a corresponding CSS file?
2. **Empty/Corrupt CSS Files**: How gracefully does the extension handle malformed theme CSS?
3. **Extremely Large Markdown Files**: Test with very large files to ensure performance remains acceptable
4. **Special Characters in Paths**: Ensure paths with spaces, Unicode characters, etc. are handled correctly
5. **Concurrent Preview Operations**: Test multiple previews opening and closing in rapid succession

## Debugging Techniques

### Using Debug Mode

1. Enable debug mode using the keyboard shortcut `Ctrl+Shift+Alt+D` or through the command palette
2. Check the Developer Console (Help > Toggle Developer Tools) for detailed logs
3. Debug messages are prefixed with `[Enhanced Preview]` for easy filtering

### Common Debugging Patterns

#### Theme Loading Issues
```
[Enhanced Preview] Theme CSS file not found: /path/to/styles/theme-name.css
```
This indicates the theme file doesn't exist. Check the path and ensure the theme name matches exactly.

#### Panel State Issues
```
[Enhanced Preview] Cannot update content - panel disposed or null
```
This indicates a state management issue. Check the panel disposal and creation logic.

### Debugging Process
1. Enable debug mode
2. Reproduce the issue with detailed steps
3. Check debug output in the console
4. Look for any error messages or warnings
5. Check the state transitions (panel creation, content updates, disposal)
6. Verify that the correct CSS files are being loaded
7. Check that the correct view column is being used

For complex issues, you can add temporary debug statements using `this.addDebugInfo()` in key parts of the code.