// Simple test to verify enhanced preview functionality
// This can be run in the VS Code development environment

console.log('Testing Enhanced Preview Setup...');

// Test 1: Check if enhanced preview provider exports correctly
try {
    const EnhancedPreviewProvider = require('./enhanced-preview-provider.js');
    console.log('✅ Enhanced Preview Provider module loads correctly');
    
    // Test if the class has the required methods
    const requiredMethods = ['register', 'openEnhancedPreview', 'createPanel', 'updateContent'];
    const provider = new EnhancedPreviewProvider();
    
    for (const method of requiredMethods) {
        if (typeof provider[method] === 'function' || typeof EnhancedPreviewProvider[method] === 'function') {
            console.log(`✅ Method '${method}' exists`);
        } else {
            console.log(`❌ Method '${method}' missing`);
        }
    }
    
} catch (error) {
    console.error('❌ Error loading Enhanced Preview Provider:', error.message);
}

// Test 2: Verify package.json command definitions
try {
    const packageJson = require('./package.json');
    const commands = packageJson.contributes?.commands || [];
    const enhancedPreviewCmd = commands.find(cmd => cmd.command === 'markdown-compass.openEnhancedPreview');
    
    if (enhancedPreviewCmd) {
        console.log('✅ Enhanced preview command defined in package.json:', enhancedPreviewCmd.title);
    } else {
        console.log('❌ Enhanced preview command NOT found in package.json');
    }
    
    // Check menus
    const menus = packageJson.contributes?.menus || {};
    const editorTitleMenus = menus['editor/title'] || [];
    const enhancedPreviewMenu = editorTitleMenus.find(menu => 
        menu.command === 'markdown-compass.openEnhancedPreview'
    );
    
    if (enhancedPreviewMenu) {
        console.log('✅ Enhanced preview command in editor title menu');
    } else {
        console.log('ℹ️ Enhanced preview command not in editor title menu (this is OK)');
    }
    
} catch (error) {
    console.error('❌ Error checking package.json:', error.message);
}

// Test 3: Check extension.js for proper setup
try {
    const fs = require('fs');
    const extensionJs = fs.readFileSync('./extension.js', 'utf8');
    
    if (extensionJs.includes('EnhancedPreviewProvider.register(context)')) {
        console.log('✅ Enhanced Preview Provider registration found in extension.js');
    } else {
        console.log('❌ Enhanced Preview Provider registration NOT found in extension.js');
    }
    
    if (extensionJs.includes("command: 'markdown-compass.openEnhancedPreview'")) {
        console.log('✅ Tree item command correctly set to enhanced preview');
    } else {
        console.log('❌ Tree item command NOT set to enhanced preview');
    }
    
    // Check for duplicate registrations (should be removed)
    const duplicateRegex = /vscode\.commands\.registerCommand\(['"]markdown-compass\.openEnhancedPreview['"]/g;
    const matches = extensionJs.match(duplicateRegex);
    
    if (!matches || matches.length === 0) {
        console.log('✅ No duplicate command registrations found in extension.js');
    } else {
        console.log(`❌ Found ${matches.length} command registrations in extension.js (should be 0)`);
    }
    
} catch (error) {
    console.error('❌ Error checking extension.js:', error.message);
}

console.log('\n=== Test Summary ===');
console.log('If all tests show ✅, the enhanced preview should work as the default left-click behavior.');
console.log('If any tests show ❌, those issues need to be resolved.');
