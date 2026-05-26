# Enhanced Preview Navigation Test Instructions

> Historical note: This guide documents the retired enhanced-preview runtime. It is kept as legacy validation context and does not describe the current shipped extension, which uses VS Code's native markdown preview as the only active rendered surface.

This document contains step-by-step instructions to test the Enhanced Preview navigation functionality.

## Test Setup

1. **Open the test file**: Open `test-header-navigation.md` in the development VS Code instance
2. **Open Enhanced Preview**: Use the command palette (Ctrl+Shift+P) and run "Markdown Compass: Open Enhanced Preview"
3. **Position windows**: Arrange VS Code so you can see both the markdown file and the Enhanced Preview side by side

## Test Scenarios

### Scenario 1: Enhanced Preview Active Navigation
1. **Verify Enhanced Preview is open** - You should see the Enhanced Preview panel with rendered markdown
2. **Click on a header in the outline** - Use the Markdown Compass outline to click on "Second Header"
3. **Expected Result**: The Enhanced Preview should scroll to the "Second Header" section
4. **Check console**: Open Developer Tools (Help > Toggle Developer Tools) and check for the console message: "Enhanced Preview is active - using Enhanced Preview navigation"

### Scenario 2: Fallback Navigation (Enhanced Preview Closed)
1. **Close Enhanced Preview** - Close the Enhanced Preview panel
2. **Click on a header in the outline** - Use the Markdown Compass outline to click on "Third Header"
3. **Expected Result**: VS Code should open the standard markdown preview and navigate to "Third Header"
4. **Check console**: Should see fallback navigation messages in the console

### Scenario 3: Mixed Navigation
1. **Open Enhanced Preview again**
2. **Test multiple headers** - Click on different headers in the outline:
   - "First Header"
   - "Sub-header 1.1" 
   - "Deep Header 2.1.1"
   - "Third Header"
3. **Expected Result**: Each click should smoothly navigate to the corresponding header in Enhanced Preview

## Debugging Steps

If navigation isn't working:

1. **Check Extension Activation**:
   - Open Developer Tools Console
   - Look for extension activation messages
   - Verify no error messages during activation

2. **Check Enhanced Preview Provider**:
   - Look for "Enhanced Preview Provider registration" messages in console
   - Verify the provider reference is being stored correctly

3. **Check Navigation Commands**:
   - Look for "Enhanced Preview is active" or "Enhanced Preview navigation failed" messages
   - If fallback messages appear, check why Enhanced Preview detection failed

4. **Verify Header Detection**:
   - Check that headers are being detected correctly in the outline
   - Verify line numbers are correct

## Success Criteria

✅ **Enhanced Preview Navigation**: When Enhanced Preview is open, clicking outline headers navigates within Enhanced Preview
✅ **Fallback Navigation**: When Enhanced Preview is closed, clicking outline headers opens standard preview  
✅ **Error Handling**: Failed Enhanced Preview navigation gracefully falls back to standard methods
✅ **Console Logging**: Clear console messages indicate which navigation method is being used
✅ **Smooth UX**: Navigation feels responsive and intuitive

## Troubleshooting

### Common Issues:
- **Navigation goes to wrong location**: Check if line numbers in outline are accurate
- **Enhanced Preview not detected**: Verify the provider reference is being stored during registration
- **Fallback always used**: Check Enhanced Preview disposal state and panel existence
- **No navigation at all**: Verify header provider is working and commands are registered

### Debug Commands:
```javascript
// Run in Developer Tools Console to check Enhanced Preview state
console.log('Enhanced Preview Provider:', enhancedPreviewProvider);
console.log('Panel exists:', enhancedPreviewProvider?.panel ? 'Yes' : 'No');
console.log('Is disposed:', enhancedPreviewProvider?.isDisposed ? 'Yes' : 'No');
```
