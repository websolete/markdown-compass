// Enhanced Preview Navigation Test
// This script tests the integration between header navigation and Enhanced Preview

const vscode = require('vscode');

async function testEnhancedPreviewNavigation() {
    console.log('=== Enhanced Preview Navigation Test ===');
    
    try {
        // Get the extension
        const extension = vscode.extensions.getExtension('your-publisher.markdown-navigator');
        if (!extension) {
            console.error('Extension not found');
            return;
        }
        
        if (!extension.isActive) {
            console.log('Activating extension...');
            await extension.activate();
        }
        
        console.log('Extension is active');
        
        // Test the header navigation command
        console.log('Testing header navigation command...');
        
        // First, open a test markdown file
        const testFile = vscode.Uri.file(__dirname + '/test-header-navigation.md');
        const document = await vscode.workspace.openTextDocument(testFile);
        await vscode.window.showTextDocument(document);
        
        console.log('Test file opened');
        
        // Test navigation to line 5 (First Header)
        console.log('Testing navigation to First Header (line 5)...');
        await vscode.commands.executeCommand('markdown-navigator.goToHeader', 5);
        
        console.log('Navigation command executed');
        
        // Test Enhanced Preview activation
        console.log('Testing Enhanced Preview activation...');
        await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', testFile);
        
        console.log('Enhanced Preview opened');
        
        // Test navigation with Enhanced Preview active
        console.log('Testing navigation with Enhanced Preview active...');
        await vscode.commands.executeCommand('markdown-navigator.goToHeader', 9);
        
        console.log('Test completed successfully');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Export for manual testing
module.exports = { testEnhancedPreviewNavigation };

// Run if called directly
if (require.main === module) {
    testEnhancedPreviewNavigation();
}
