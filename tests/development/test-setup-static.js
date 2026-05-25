// Test setup verification without VS Code module dependencies
// This version focuses on static code analysis without requiring the VS Code API

const fs = require('fs');
const path = require('path');

console.log('Testing Enhanced Preview Setup (Static Analysis)...');

// Test 1: Check package.json for command definition
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const commands = packageJson.contributes?.commands || [];
    
    const enhancedPreviewCmd = commands.find(cmd => cmd.command === 'markdown-navigator.openEnhancedPreview');
    if (enhancedPreviewCmd) {
        console.log(`✅ Enhanced preview command defined in package.json: ${enhancedPreviewCmd.title}`);
    } else {
        console.log('❌ Enhanced preview command NOT found in package.json');
    }
    
    // Check if command is in editor title menu
    const menus = packageJson.contributes?.menus?.['editor/title'] || [];
    const enhancedPreviewMenu = menus.find(menu => 
        menu.command === 'markdown-navigator.openEnhancedPreview'
    );
    
    if (enhancedPreviewMenu) {
        console.log('✅ Enhanced preview command found in editor title menu');
    } else {
        console.log('ℹ️ Enhanced preview command not in editor title menu (this is OK)');
    }
    
} catch (error) {
    console.error('❌ Error checking package.json:', error.message);
}

// Test 2: Check extension.js for proper setup
try {
    const extensionJs = fs.readFileSync('./extension.js', 'utf8');
    
    if (extensionJs.includes('EnhancedPreviewProvider.register(context)')) {
        console.log('✅ Enhanced Preview Provider registration found in extension.js');
    } else {
        console.log('❌ Enhanced Preview Provider registration NOT found in extension.js');
    }
    
    if (extensionJs.includes("command: 'markdown-navigator.openEnhancedPreview'")) {
        console.log('✅ Tree item command correctly set to enhanced preview');
    } else {
        console.log('❌ Tree item command NOT set to enhanced preview');
    }
    
    // Check for duplicate registrations (should be removed)
    const duplicateRegex = /vscode\.commands\.registerCommand\(['"]markdown-navigator\.openEnhancedPreview['"]/g;
    const matches = extensionJs.match(duplicateRegex);
    
    if (!matches || matches.length === 0) {
        console.log('✅ No duplicate command registrations found in extension.js');
    } else {
        console.log(`❌ Found ${matches.length} command registrations in extension.js (should be 0)`);
    }
    
} catch (error) {
    console.error('❌ Error checking extension.js:', error.message);
}

// Test 3: Check enhanced-preview-provider.js exists and is properly structured
try {
    const providerPath = './enhanced-preview-provider.js';
    if (fs.existsSync(providerPath)) {
        console.log('✅ Enhanced Preview Provider file exists');
        
        const providerContent = fs.readFileSync(providerPath, 'utf8');
        
        // Check for required methods
        const requiredMethods = ['register', 'openEnhancedPreview', 'createPanel', 'updateContent'];
        const foundMethods = [];
        
        requiredMethods.forEach(method => {
            if (providerContent.includes(method)) {
                foundMethods.push(method);
            }
        });
        
        if (foundMethods.length === requiredMethods.length) {
            console.log(`✅ All required methods found in provider: ${foundMethods.join(', ')}`);
        } else {
            const missing = requiredMethods.filter(m => !foundMethods.includes(m));
            console.log(`❌ Missing methods in provider: ${missing.join(', ')}`);
        }
        
        // Check for command registration
        if (providerContent.includes("'markdown-navigator.openEnhancedPreview'")) {
            console.log('✅ Enhanced preview command registration found in provider');
        } else {
            console.log('❌ Enhanced preview command registration NOT found in provider');
        }
        
    } else {
        console.log('❌ Enhanced Preview Provider file not found');
    }
    
} catch (error) {
    console.error('❌ Error checking enhanced-preview-provider.js:', error.message);
}

console.log('=== Static Analysis Summary ===');
console.log('This test performs static code analysis without requiring VS Code API.');
console.log('For complete testing, run the extension in VS Code development environment.');
console.log('Use: code --extensionDevelopmentPath .');
