/**
 * Automated Panel Lifecycle Validation Test
 * Tests the Enhanced Preview panel fix implementation
 */

const vscode = require('vscode');
const path = require('path');

async function runPanelLifecycleTest() {
    console.log('🧪 Starting Enhanced Preview Panel Lifecycle Test...');

    try {
        // Test 1: Get the extension
        const extension = vscode.extensions.getExtension('your-publisher.markdown-compass');
        if (!extension) {
            throw new Error('Extension not found - make sure it\'s installed and active');
        }

        console.log('✅ Extension found:', extension.id);

        // Activate extension if not already active
        if (!extension.isActive) {
            console.log('🔄 Activating extension...');
            await extension.activate();
        }

        console.log('✅ Extension is active');

        // Test 2: Check if enhanced preview provider is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        console.log('✅ Workspace folder:', workspaceFolder.uri.fsPath);

        // Test 3: Try to trigger enhanced preview command
        console.log('🔄 Testing Enhanced Preview command...');

        // Open the test markdown file
        const testFilePath = path.join(workspaceFolder.uri.fsPath, 'test-enhanced-preview-validation.md');
        const testFileUri = vscode.Uri.file(testFilePath);

        const document = await vscode.workspace.openTextDocument(testFileUri);
        await vscode.window.showTextDocument(document);

        console.log('✅ Test document opened:', testFilePath);

        // Test 4: Simulate panel lifecycle
        console.log('🔄 Testing panel lifecycle...');

        // First panel open
        await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview');
        console.log('✅ First Enhanced Preview command executed');

        // Wait a moment for panel to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if any webview panels exist
        const panels = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => tab.input instanceof vscode.TabInputWebview);

        console.log(`📊 Found ${panels.length} webview panel(s)`);

        if (panels.length > 0) {
            console.log('✅ Enhanced Preview panel created successfully');

            // Close the panel (simulating user action)
            console.log('🔄 Closing panel...');
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

            // Wait for closure
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try to open again (this is where the bug occurred)
            console.log('🔄 Opening Enhanced Preview again (critical test)...');
            await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview');

            // Wait for panel recreation
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check panels again
            const panelsAfterReopen = vscode.window.tabGroups.all
                .flatMap(group => group.tabs)
                .filter(tab => tab.input instanceof vscode.TabInputWebview);

            console.log(`📊 Found ${panelsAfterReopen.length} webview panel(s) after reopen`);

            if (panelsAfterReopen.length > 0) {
                console.log('✅ CRITICAL TEST PASSED: Panel recreated successfully after closure');
                console.log('🎉 Enhanced Preview panel lifecycle fix appears to be working!');

                return {
                    success: true,
                    message: 'Panel lifecycle test completed successfully',
                    details: {
                        initialPanelCreated: true,
                        panelClosedSuccessfully: true,
                        panelRecreatedAfterClosure: true,
                        panelCount: panelsAfterReopen.length
                    }
                };
            } else {
                console.error('❌ CRITICAL TEST FAILED: No panel found after reopen');
                return {
                    success: false,
                    message: 'Panel not recreated after closure',
                    details: {
                        initialPanelCreated: true,
                        panelClosedSuccessfully: true,
                        panelRecreatedAfterClosure: false
                    }
                };
            }
        } else {
            console.error('❌ Initial panel creation failed');
            return {
                success: false,
                message: 'Initial Enhanced Preview panel was not created',
                details: {
                    initialPanelCreated: false
                }
            };
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);

        return {
            success: false,
            message: `Test failed: ${error.message}`,
            error: error.stack
        };
    }
}

// Export for use in extension context or run directly
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runPanelLifecycleTest };
} else {
    // Run if executed directly in VS Code context
    runPanelLifecycleTest().then(result => {
        console.log('🔍 Test Results:', JSON.stringify(result, null, 2));
    });
}

/**
 * Manual Testing Instructions:
 *
 * 1. Open VS Code with the Markdown Compass extension in development mode
 * 2. Open the Command Palette (Ctrl+Shift+P)
 * 3. Run "Developer: Execute JavaScript in Terminal"
 * 4. Paste and execute this test script
 * 5. Review the console output for test results
 *
 * Alternative: Use this script within an extension test context
 */
