// Test script for Enhanced Preview functionality
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

async function testEnhancedPreview() {
    console.log('=== Testing Enhanced Preview Functionality ===');
    
    try {
        // Get the test markdown file path
        const testFilePath = path.join(__dirname, 'test-preview.md');
        
        // Check if test file exists
        if (!fs.existsSync(testFilePath)) {
            console.error('Test file does not exist:', testFilePath);
            return false;
        }
        
        console.log('Test file found:', testFilePath);
        
        // Create URI for the test file
        const testUri = vscode.Uri.file(testFilePath);
        
        // Test the enhanced preview command
        console.log('Executing enhanced preview command...');
        
        try {
            await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', testUri);
            console.log('✓ Enhanced preview command executed successfully');
            
            // Wait a moment for the preview to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Test debug mode toggle
            console.log('Testing debug mode toggle...');
            await vscode.commands.executeCommand('markdown-navigator.toggleEnhancedPreviewDebug');
            console.log('✓ Debug mode toggle executed successfully');
            
            return true;
            
        } catch (commandError) {
            console.error('Failed to execute enhanced preview command:', commandError);
            return false;
        }
        
    } catch (error) {
        console.error('Test failed with error:', error);
        return false;
    }
}

// Export the test function
module.exports = { testEnhancedPreview };

// If running directly
if (require.main === module) {
    testEnhancedPreview().then(success => {
        console.log(success ? '✓ All tests passed' : '✗ Tests failed');
        process.exit(success ? 0 : 1);
    });
}
