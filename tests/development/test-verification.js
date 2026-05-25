// Quick test to verify the enhanced preview command registration
// This is just for local testing and can be deleted after verification

const vscode = require('vscode');

// Check if the enhanced preview command is registered
async function testEnhancedPreviewCommand() {
    try {
        // Get all available commands
        const commands = await vscode.commands.getCommands();
        
        // Check if our command is registered
        const hasEnhancedPreview = commands.includes('markdown-navigator.openEnhancedPreview');
        
        console.log('=== Enhanced Preview Command Registration Test ===');
        console.log('Enhanced Preview command registered:', hasEnhancedPreview);
        
        if (hasEnhancedPreview) {
            console.log('✅ SUCCESS: Enhanced preview command is properly registered');
        } else {
            console.log('❌ FAILURE: Enhanced preview command is NOT registered');
        }
        
        // Also check for the debug toggle command
        const hasDebugToggle = commands.includes('markdown-navigator.toggleEnhancedPreviewDebug');
        console.log('Debug toggle command registered:', hasDebugToggle);
        
        return hasEnhancedPreview;
        
    } catch (error) {
        console.error('Error testing command registration:', error);
        return false;
    }
}

// Export for potential use
module.exports = { testEnhancedPreviewCommand };
