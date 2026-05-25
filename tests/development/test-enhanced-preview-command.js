// Test script to verify enhanced preview command registration and functionality
// Run this in the VS Code extension development console

const vscode = require('vscode');
const path = require('path');

async function testEnhancedPreview() {
    console.log('=== Testing Enhanced Preview Command ===');
    
    try {
        // Check if the command is registered
        const commands = await vscode.commands.getCommands();
        const enhancedPreviewCommand = commands.find(cmd => cmd === 'markdown-navigator.openEnhancedPreview');
        
        if (enhancedPreviewCommand) {
            console.log('✅ Enhanced preview command is registered:', enhancedPreviewCommand);
        } else {
            console.log('❌ Enhanced preview command NOT found in registered commands');
            console.log('Available markdown-navigator commands:', 
                commands.filter(cmd => cmd.startsWith('markdown-navigator.')));
            return;
        }
        
        // Try to execute the command with test file
        const testFilePath = path.join(__dirname, 'test-enhanced-preview.md');
        const testUri = vscode.Uri.file(testFilePath);
        
        console.log('🧪 Attempting to execute enhanced preview command with:', testUri.toString());
        
        await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', {
            uri: testUri
        });
        
        console.log('✅ Enhanced preview command executed successfully');
        
    } catch (error) {
        console.error('❌ Error testing enhanced preview:', error);
        console.error('Stack:', error.stack);
    }
}

// Export for testing
module.exports = { testEnhancedPreview };

// If run directly, execute the test
if (require.main === module) {
    testEnhancedPreview().then(() => {
        console.log('Test completed');
    }).catch(error => {
        console.error('Test failed:', error);
    });
}
