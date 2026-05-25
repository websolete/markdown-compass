# Markdown Navigator Debugging and Troubleshooting Guide

## Debug Tools and Features

### Debug Mode for Enhanced Preview

The Markdown Navigator extension includes a powerful debug mode for the Enhanced Preview feature. This helps troubleshoot issues with markdown rendering, theme application, and CFML syntax highlighting.

#### Enabling Debug Mode

1. **Using Command Palette**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Search for "Markdown Navigator: Toggle Enhanced Preview Debug Mode"
   - Select the command to toggle debug mode on/off

2. **Via Custom Keyboard Shortcut**
   - Add a custom keyboard shortcut in your VS Code keybindings.json
   ```json
   {
       "key": "ctrl+shift+alt+d",
       "command": "markdown-navigator.toggleEnhancedPreviewDebug",
       "when": "editorLangId == 'markdown'"
   }
   ```

#### Debug Panel Features

When debug mode is enabled, a panel appears in the bottom-right corner of the Enhanced Preview showing:

- Timestamps for all operations
- File loading events
- Markdown parsing information
- Theme application details
- CFML syntax highlighting statistics
- Error messages and stack traces

#### Using Debug Information

The debug panel is particularly helpful for diagnosing:

1. **Theme Loading Issues**
   - Check if theme CSS files are being correctly located and loaded
   - Verify theme CSS application order

2. **CFML Syntax Highlighting Problems**
   - See which pattern matches are being detected
   - Check for any syntax highlighting errors

3. **Performance Bottlenecks**
   - Identify slow operations in the preview generation pipeline
   - Find potential optimization opportunities

4. **Content Processing Errors**
   - Track the full markdown-to-HTML conversion process
   - Identify specific stages where problems occur

## Static Validation Tools

The extension includes static validation scripts that can be run to verify the internal consistency of the extension:

### Command Registration Validation

Run the static command validation script:

```bash
cd /path/to/markdown-navigator
node tests/development/static-command-validation.js
```

This validates:
- Command registration in code files
- Command definitions in package.json
- Command implementation presence
- Tree item command configuration

## Common Issues and Solutions

### 1. Preview Not Rendering

**Symptoms:** Blank preview or error message shown

**Troubleshooting with Debug Mode:**
1. Enable debug mode using the toggle command
2. Check for file reading errors in the debug panel
3. Look for errors in the HTML generation process

**Potential Solutions:**
- Verify the markdown file is valid and accessible
- Check workspace permissions
- Try restarting VS Code

### 2. Theme Not Applied Correctly 

**Symptoms:** Preview uses default styling or incorrect theme

**Troubleshooting with Debug Mode:**
1. Enable debug mode
2. Look for theme CSS loading messages
3. Check for any errors with CSS file access

**Potential Solutions:**
- Verify theme name in settings matches available themes
- Check custom CSS path if configured
- Try refreshing the preview

### 3. CFML Syntax Highlighting Issues

**Symptoms:** CFML code not highlighted or incorrectly highlighted

**Troubleshooting with Debug Mode:**
1. Enable debug mode
2. Look for CFML pattern matching counts
3. Check for errors in syntax highlighting process

**Potential Solutions:**
- Ensure CFML syntax highlighting is enabled in settings
- Use proper CFML code fence format (```cfml)
- Check for conflicting formatting in code blocks

## Reporting Issues

When reporting issues, please include:

1. Debug information from the Enhanced Preview debug panel
2. Your VS Code version and extension version
3. Steps to reproduce the issue
4. Sample markdown file (if possible)

Submit issues to the extension repository on GitHub: [Markdown Navigator Issues](https://github.com/yourusername/markdown-navigator/issues)
