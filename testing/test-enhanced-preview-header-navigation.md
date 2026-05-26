# Enhanced Preview Header Navigation Fix - Testing Guide

> Historical note: This guide documents the retired enhanced-preview runtime. It is kept as legacy validation context and does not describe the current shipped extension, which uses VS Code's native markdown preview as the only active rendered surface.

## Overview
This guide helps verify that the Enhanced Preview header navigation fix is working correctly. The fix addresses issues where clicking headers in the sidebar either scrolled to wrong locations, failed to work on subsequent clicks, or didn't open Enhanced Preview properly.

## What Was Fixed

### Before the Fix:
- Header navigation used flawed line number estimation: `Math.floor((index + 1) * (lineNumber / headers.length))`
- Subsequent clicks to the same header often failed
- Enhanced Preview wouldn't open automatically when clicking headers
- Headers with special characters weren't handled properly

### After the Fix:
- **Exact text matching**: Headers are matched by their actual text content
- **Reliable repeated clicks**: Same header can be clicked multiple times successfully  
- **Auto-open Enhanced Preview**: Opens Enhanced Preview if not already active
- **Proper fallback**: Line number estimation used only when text matching fails

## Manual Testing Steps

### Setup
1. Install the fixed extension (markdown-navigator-1.6.30.vsix)
2. Open the test file: `test-header-navigation-fix.md`
3. Open the Markdown Navigator sidebar (Activity Bar → Markdown Navigator icon)

### Test 1: Basic Header Navigation
1. **Navigate to each header** by clicking them in the "Current Document" section
   - ✅ **Expected**: Enhanced Preview opens and scrolls to exact header
   - ✅ **Expected**: Headers are highlighted briefly with yellow background
   - ❌ **Old behavior**: Would scroll to wrong positions due to estimation

### Test 2: Repeated Navigation  
1. Click on "Second Section" header
2. Click on "First Section" header  
3. Click on "Second Section" header again (same header as step 1)
   - ✅ **Expected**: Each click works and scrolls to correct header
   - ❌ **Old behavior**: Subsequent clicks would fail or scroll incorrectly

### Test 3: Enhanced Preview Auto-Open
1. Close any open Enhanced Preview tabs
2. Click on any header in the sidebar
   - ✅ **Expected**: Enhanced Preview opens automatically and navigates to header
   - ❌ **Old behavior**: Would open standard preview instead

### Test 4: Special Characters in Headers
1. Test headers with numbers, dots, and special characters:
   - "Subsection 1.1"
   - "Subsection 1.2" 
   - "Subsection 2.1"
   - "Final Subsection"
   - ✅ **Expected**: All headers navigate correctly regardless of content
   - ❌ **Old behavior**: Headers with special characters might fail

### Test 5: Deep Document Navigation
1. Use the longer test file with multiple sections
2. Click headers that are far apart (e.g., first header, then last header)
   - ✅ **Expected**: Smooth scrolling to exact positions
   - ❌ **Old behavior**: Estimation errors increased with document size

## Verification Checklist

| Test | Description | Status |
|------|-------------|--------|
| ✅ | First click on any header works correctly | |
| ✅ | Repeated clicks on same header work | |
| ✅ | Enhanced Preview opens when not active | |
| ✅ | Headers with numbers/dots work (e.g., "1.1") | |
| ✅ | Headers are highlighted when navigated to | |
| ✅ | Navigation works in both light and dark themes | |
| ✅ | No console errors during navigation | |

## Technical Implementation Details

### Key Changes Made:
1. **Added `targetHeaderText` property** to store exact header text
2. **Modified command registration** to accept `(fileUri, lineNumber, headerText)` parameters  
3. **Implemented text-based matching** in webview JavaScript:
   ```javascript
   // Method 1: Exact text matching (preferred)
   if (headerTextContent === trimmedTargetText) {
       targetHeader = header;
   }
   
   // Method 2: Line number estimation (fallback only)
   if (!targetHeader && lineNumber) {
       // Use estimation only when text matching fails
   }
   ```
4. **Enhanced message handling** to clear both line number and header text
5. **Updated extension.js** to pass header text parameter

### Files Modified:
- `enhanced-preview-provider.js` - Core scrolling logic and text matching
- `extension.js` - Command integration and Enhanced Preview fallback

## Troubleshooting

### If Navigation Still Fails:
1. **Check console**: Open Developer Tools (Help → Toggle Developer Tools)
2. **Look for errors**: Check Console tab for any error messages
3. **Verify text matching**: Headers should log "Found exact text match for header: ..."
4. **Debug mode**: Enable enhanced preview debug mode for detailed logs

### Debug Commands:
```javascript
// In VS Code console (F1 → Developer: Reload Window to reset)
vscode.commands.executeCommand('markdown-navigator.toggleEnhancedPreviewDebug');
```

## Success Criteria
The fix is working correctly when:
- ✅ Every header click navigates to the exact correct position
- ✅ Repeated clicks to the same header continue to work
- ✅ Enhanced Preview opens automatically when needed
- ✅ Headers are highlighted briefly when navigated to
- ✅ No console errors or failed navigation attempts

## Performance Notes
- **Text matching is faster** than line number estimation
- **Memory usage is minimal** - only stores current target text/line
- **Fallback behavior** ensures compatibility if text matching fails
- **Auto-cleanup** clears target values after navigation completes
