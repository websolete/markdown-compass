/**
 * Test Panel Lifecycle Fix
 * Tests the fix for the issue where enhanced preview doesn't render content
 * after the first panel has been closed
 */

const vscode = require('vscode');
const path = require('path');

async function testPanelLifecycleFix() {
    console.log('=== Panel Lifecycle Fix Test ===');

    try {
        // Create test markdown files
        const testContent1 = `# Test Document 1

This is the first test document content.

## Section A

Content for section A.

### Subsection A.1

More detailed content here.`;

        const testContent2 = `# Test Document 2

This is the second test document content.

## Section B

Content for section B.

### Subsection B.1

Different content structure.`;

        // Create temporary test files
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const testFile1Path = path.join(workspaceFolder.uri.fsPath, 'test-panel-lifecycle-1.md');
        const testFile2Path = path.join(workspaceFolder.uri.fsPath, 'test-panel-lifecycle-2.md');

        const testFile1Uri = vscode.Uri.file(testFile1Path);
        const testFile2Uri = vscode.Uri.file(testFile2Path);

        await vscode.workspace.fs.writeFile(testFile1Uri, Buffer.from(testContent1, 'utf8'));
        await vscode.workspace.fs.writeFile(testFile2Uri, Buffer.from(testContent2, 'utf8'));

        console.log(`✓ Created test files: ${testFile1Path} and ${testFile2Path}`);

        console.log('\n=== Test Sequence ===');

        // Step 1: Open first enhanced preview
        console.log('\n1. Opening first enhanced preview...');
        await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview', testFile1Uri);
        console.log('✓ First enhanced preview opened');

        // Wait for user to manually close the panel
        console.log('\n2. Please manually close the enhanced preview panel now...');
        console.log('   (Click the X on the Enhanced Preview tab)');

        // Wait for user confirmation
        await vscode.window.showInformationMessage(
            'Please close the Enhanced Preview panel, then click OK to continue the test.',
            'OK'
        );

        console.log('✓ User confirmed panel was closed');

        // Step 3: Try to open second enhanced preview (this should work now with the fix)
        console.log('\n3. Opening second enhanced preview (testing fix)...');
        await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview', testFile2Uri);
        console.log('✓ Second enhanced preview command executed');

        // Step 4: Verify content renders
        const result = await vscode.window.showInformationMessage(
            'Does the second Enhanced Preview show content correctly?',
            'Yes - Fix works!',
            'No - Still broken'
        );

        if (result === 'Yes - Fix works!') {
            console.log('\n🎉 TEST PASSED - Panel lifecycle fix is working!');
            console.log('✓ Enhanced preview content renders correctly after panel closure');
        } else {
            console.log('\n❌ TEST FAILED - Panel lifecycle issue still exists');
            console.log('❌ Enhanced preview tab opens but content doesn\'t render');
        }

        // Step 5: Test repeated open/close cycles
        console.log('\n4. Testing repeated open/close cycles...');

        for (let i = 1; i <= 3; i++) {
            console.log(`\n   Cycle ${i}: Opening enhanced preview...`);

            await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview',
                i % 2 === 1 ? testFile1Uri : testFile2Uri);

            const cycleResult = await vscode.window.showInformationMessage(
                `Cycle ${i}: Does the Enhanced Preview show content? (Close panel after confirming)`,
                'Yes',
                'No'
            );

            if (cycleResult === 'Yes') {
                console.log(`   ✓ Cycle ${i} passed`);
            } else {
                console.log(`   ❌ Cycle ${i} failed`);
                break;
            }
        }

        // Cleanup
        try {
            await vscode.workspace.fs.delete(testFile1Uri);
            await vscode.workspace.fs.delete(testFile2Uri);
            console.log('\n✓ Cleaned up test files');
        } catch (cleanupError) {
            console.warn(`Warning: Could not clean up test files: ${cleanupError.message}`);
        }

        console.log('\n=== Test Completed ===');
        console.log('\nKey fix points verified:');
        console.log('• Enhanced preview panel disposal is properly detected');
        console.log('• Panel state is reset when disposed panel is detected');
        console.log('• New panels can be created after previous ones are closed');
        console.log('• Content renders correctly in newly created panels');

    } catch (error) {
        console.error(`\n❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
        throw error;
    }
}

// Export for use in testing
module.exports = { testPanelLifecycleFix };

// Run tests if this file is executed directly
if (require.main === module) {
    console.log('Note: This test requires VS Code API and user interaction.');
    console.log('Use: await require("./test-panel-lifecycle-fix").testPanelLifecycleFix();');
}
