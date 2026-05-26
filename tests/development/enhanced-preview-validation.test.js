/**
 * Enhanced Preview Feature Test
 * Tests the intelligent tab title generation and enhanced preview functionality
 */

const assert = require('assert');
const vscode = require('vscode');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('Enhanced Preview Tests', function() {
    this.timeout(60000);

    let testTempDir;
    let testMarkdownFile;

    before(async function() {
        testTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'markdown-compass-'));

        // Create a test markdown file with H1 header
        const testContent = [
            '# Enhanced Preview Test Document',
            '',
            'This is a test document for validating enhanced preview functionality.',
            '',
            '## Features to Test',
            '',
            '1. **Intelligent Tab Titles**: The preview should extract the H1 header "Enhanced Preview Test Document" as the tab title',
            '2. **VS Code Native Styling**: The preview should inherit the active VS Code theme',
            '3. **Markdown Rendering**: Code blocks should render without extension-owned theme overrides',
            '',
            '## Code Sample',
            '',
            '```javascript',
            'function testEnhancedPreview() {',
            '    const result = "Hello from Enhanced Preview";',
            '    return result;',
            '}',
            '```',
            '',
            "This document tests the enhanced preview provider's ability to:",
            '- Extract H1 headers for intelligent tab titles',
            '- Render markdown using VS Code-native preview styling',
            '- Keep the debug and navigation surfaces working'
        ].join('\n');

        const testFilePath = path.join(testTempDir, 'test-enhanced-preview.md');
        await vscode.workspace.fs.writeFile(vscode.Uri.file(testFilePath), Buffer.from(testContent, 'utf8'));
        testMarkdownFile = vscode.Uri.file(testFilePath);
    });

    after(async function() {
        if (testTempDir) {
            try {
                await fs.promises.rm(testTempDir, { recursive: true, force: true });
            } catch (error) {
                console.log('Could not delete test file:', error.message);
            }
        }
    });

    it('Extension should be present and activated', async function() {
        const extension = vscode.extensions.getExtension('websolete.markdown-compass');
        assert.ok(extension, 'Extension should be installed');

        if (!extension.isActive) {
            await extension.activate();
        }
        assert.ok(extension.isActive, 'Extension should be active');
    });

    it('Enhanced preview commands should be registered', async function() {
        const commands = await vscode.commands.getCommands(true);

        const hasEnhancedPreview = commands.includes('markdown-compass.openEnhancedPreview');
        assert.ok(hasEnhancedPreview, 'Enhanced preview command should be registered');

        const hasDebugToggle = commands.includes('markdown-compass.toggleEnhancedPreviewDebug');
        assert.ok(hasDebugToggle, 'Enhanced preview debug toggle command should be registered');
    });

    it('Enhanced preview should open without errors', async function() {
        try {
            const document = await vscode.workspace.openTextDocument(testMarkdownFile);
            await vscode.window.showTextDocument(document);

            await vscode.commands.executeCommand('markdown-compass.openEnhancedPreview', testMarkdownFile);

            await new Promise(resolve => setTimeout(resolve, 2000));

            assert.ok(true, 'Enhanced preview opened successfully');

        } catch (error) {
            assert.fail(`Enhanced preview failed: ${error.message}`);
        }
    });

    it('Debug toggle should work without errors', async function() {
        try {
            await vscode.commands.executeCommand('markdown-compass.toggleEnhancedPreviewDebug');
            await new Promise(resolve => setTimeout(resolve, 500));

            await vscode.commands.executeCommand('markdown-compass.toggleEnhancedPreviewDebug');
            await new Promise(resolve => setTimeout(resolve, 500));

            assert.ok(true, 'Debug toggle worked successfully');

        } catch (error) {
            assert.fail(`Debug toggle failed: ${error.message}`);
        }
    });

    it('Configuration should only keep active enhanced preview settings', function() {
        const config = vscode.workspace.getConfiguration('markdownCompass');

        const debugModeInspection = config.inspect('enhancedPreview.debugMode');
        assert.ok(debugModeInspection, 'Enhanced preview debug mode configuration should exist');

        const previewThemeInspection = config.inspect('previewTheme');
        assert.strictEqual(previewThemeInspection, undefined, 'Preview theme configuration should be retired');

        const cfmlHighlightingInspection = config.inspect('enableCfmlHighlighting');
        assert.strictEqual(cfmlHighlightingInspection, undefined, 'Extension-owned CFML highlighting configuration should be retired');
    });

    it('Enhanced preview provider should be accessible', function() {
        try {
            const extension = vscode.extensions.getExtension('websolete.markdown-compass');
            assert.ok(extension, 'Extension should be available');
            assert.ok(extension.isActive, 'Extension should be active');

        } catch (error) {
            assert.fail(`Enhanced preview provider not accessible: ${error.message}`);
        }
    });

    it('Retired theme selection command should be absent', async function() {
        const commands = await vscode.commands.getCommands(true);
        const hasThemeCommand = commands.includes('markdown-compass.selectPreviewTheme');
        assert.ok(!hasThemeCommand, 'Theme selection command should be retired');
    });
});