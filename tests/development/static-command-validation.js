/**
 * Static Command Registry Validation
 * Validates command registration without requiring the VS Code API
 * Can be run in a Node.js environment outside VS Code
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== Markdown Compass Command Registry Validation ===');

try {
    const extensionDir = path.join(__dirname, '..', '..');
    const extensionJsPath = path.join(extensionDir, 'extension.js');
    const enhancedPreviewPath = path.join(extensionDir, 'enhanced-preview-provider.js');
    const packageJsonPath = path.join(extensionDir, 'package.json');

    const requiredCommands = [
        'markdown-compass.openEnhancedPreview',
        'markdown-compass.toggleEnhancedPreviewDebug'
    ];

    let validationResults = {
        passed: 0,
        failed: 0,
        messages: []
    };

    function recordResult(success, message) {
        if (success) {
            validationResults.passed++;
            validationResults.messages.push(`✅ ${message}`);
        } else {
            validationResults.failed++;
            validationResults.messages.push(`❌ ${message}`);
        }
    }

    console.log('Reading extension files...');

    const extensionJs = fs.readFileSync(extensionJsPath, 'utf8');
    const enhancedPreview = fs.readFileSync(enhancedPreviewPath, 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    console.log('Validating command registrations...');

    const packageCommands = packageJson.contributes.commands.map(cmd => cmd.command);

    for (const cmd of requiredCommands) {
        const defined = packageCommands.includes(cmd);
        recordResult(defined, `Command "${cmd}" ${defined ? 'is' : 'is NOT'} defined in package.json`);
    }

    for (const cmd of requiredCommands) {
        const inExtension = extensionJs.includes(`'${cmd}'`) || extensionJs.includes(`"${cmd}"`);
        const inEnhancedPreview = enhancedPreview.includes(`'${cmd}'`) || enhancedPreview.includes(`"${cmd}"`);

        recordResult(
            inExtension || inEnhancedPreview,
            `Command "${cmd}" ${inExtension || inEnhancedPreview ? 'is' : 'is NOT'} registered in code`
        );
    }

    const hasToggleMethod = enhancedPreview.includes('toggleDebugMode');
    recordResult(
        hasToggleMethod,
        `toggleDebugMode method ${hasToggleMethod ? 'is' : 'is NOT'} implemented in EnhancedPreviewProvider`
    );

    const correctTreeItemPattern = /treeItem\.command\s*=\s*\{\s*command\s*:\s*['"]markdown-compass\.openEnhancedPreview['"]/;
    const hasCorrectTreeItem = correctTreeItemPattern.test(extensionJs);

    recordResult(
        hasCorrectTreeItem,
        `Tree items ${hasCorrectTreeItem ? 'are' : 'are NOT'} configured to use enhanced preview command`
    );

    console.log('\n=== Validation Results ===');
    validationResults.messages.forEach(msg => console.log(msg));
    console.log(`\nTests: ${validationResults.passed} passed, ${validationResults.failed} failed`);

    if (validationResults.failed > 0) {
        console.error('\n❌ Validation failed - see issues above');
        process.exit(1);
    } else {
        console.log('\n✅ All validations passed!');
        process.exit(0);
    }

} catch (error) {
    console.error(`\n❌ Error during validation: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
}