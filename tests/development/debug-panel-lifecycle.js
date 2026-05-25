/**
 * Debug Panel Lifecycle Issue
 * Simple debugging script to understand panel lifecycle
 */

const vscode = require('vscode');

async function debugPanelLifecycle() {
    console.log('=== Debug Panel Lifecycle ===');

    try {
        // Enable debug mode for enhanced preview
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        await config.update('enhancedPreview.debugMode', true, vscode.ConfigurationTarget.Global);
        console.log('✓ Enabled debug mode for enhanced preview');

        // Create a simple test file
        const testContent = `# Debug Test Document

This is a simple test document to debug panel lifecycle issues.

## Test Section

If you can see this content, the enhanced preview is working correctly.

### Current Status

- Enhanced Preview should open in a new tab
- Content should render immediately
- After closing and reopening, content should still render
`;

        // Create the test file
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found - please open a workspace first');
        }

        const testFilePath = vscode.Uri.file(workspaceFolder.uri.fsPath + '/debug-panel-test.md');
        await vscode.workspace.fs.writeFile(testFilePath, Buffer.from(testContent, 'utf8'));

        console.log(`✓ Created test file: ${testFilePath.fsPath}`);

        // Instructions for manual testing
        console.log('\n=== Manual Test Instructions ===');
        console.log('1. This script will open Enhanced Preview');
        console.log('2. Check if content renders correctly');
        console.log('3. Close the Enhanced Preview tab manually');
        console.log('4. Script will open Enhanced Preview again');
        console.log('5. Check if content renders correctly the second time');
        console.log('6. Look at debug output in VS Code Developer Console');

        // Step 1: Open enhanced preview first time
        console.log('\n--- Step 1: Opening Enhanced Preview (first time) ---');
        await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', testFilePath);
        console.log('✓ Enhanced Preview opened');

        // Wait for user to close the panel
        await vscode.window.showInformationMessage(
            'Step 1 complete. Please check that content renders, then CLOSE the Enhanced Preview tab and click OK.',
            'OK - Panel closed'
        );

        console.log('✓ User confirmed panel was closed');

        // Step 2: Open enhanced preview second time (this is where the bug occurs)
        console.log('\n--- Step 2: Opening Enhanced Preview (after closure) ---');
        await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', testFilePath);
        console.log('✓ Enhanced Preview opened again');

        // Check result
        const result = await vscode.window.showInformationMessage(
            'Step 2: Does the Enhanced Preview show content correctly?',
            { modal: true },
            'Yes - Content renders',
            'No - Empty/blank tab'
        );

        if (result === 'Yes - Content renders') {
            console.log('\n🎉 SUCCESS: Panel lifecycle fix is working!');
            vscode.window.showInformationMessage('✅ Panel lifecycle fix successful! Content renders after panel closure.');
        } else {
            console.log('\n❌ FAILURE: Panel lifecycle issue persists');
            vscode.window.showErrorMessage('❌ Panel lifecycle issue still exists. Enhanced Preview tab opens but content doesn\'t render.');
        }

        // Cleanup
        try {
            await vscode.workspace.fs.delete(testFilePath);
            console.log('✓ Cleaned up test file');
        } catch (cleanupError) {
            console.warn(`Warning: Could not clean up test file: ${cleanupError.message}`);
        }

        console.log('\n=== Debug Session Complete ===');
        console.log('Check VS Code Developer Console (Help > Toggle Developer Tools) for detailed debug output');

    } catch (error) {
        console.error(`Debug failed: ${error.message}`);
        vscode.window.showErrorMessage(`Debug failed: ${error.message}`);
        throw error;
    }
}

// Export for manual execution
module.exports = { debugPanelLifecycle };

// Instructions for running
console.log('To run this debug script:');
console.log('1. Open VS Code Command Palette (Ctrl+Shift+P)');
console.log('2. Type: Developer: Reload Window');
console.log('3. Open Developer Tools (Help > Toggle Developer Tools)');
console.log('4. In Console, run: await require("./debug-panel-lifecycle").debugPanelLifecycle()');
