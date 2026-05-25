const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const EnhancedPreviewProviderModule = require('../dist/enhanced-preview-provider');
const EnhancedPreviewProvider = EnhancedPreviewProviderModule.default || EnhancedPreviewProviderModule;

const EXTENSION_LOOKUP_IDS = [
    'Websolete.markdown-navigator',
    'websolete.markdown-navigator'
];

function getExtension() {
    for (const extensionId of EXTENSION_LOOKUP_IDS) {
        const extension = vscode.extensions.getExtension(extensionId);
        if (extension) {
            return extension;
        }
    }

    assert.fail(`Extension should be installed under one of: ${EXTENSION_LOOKUP_IDS.join(', ')}`);
}

function createStubWebview() {
    return {
        cspSource: 'vscode-webview-resource',
        asWebviewUri(uri) {
            return {
                toString: () => `webview:${path.basename(uri.fsPath)}`
            };
        }
    };
}

function createProviderForHtmlTests(targetUri) {
    const provider = new EnhancedPreviewProvider();
    provider.currentUri = targetUri;
    provider.panel = {
        webview: createStubWebview()
    };
    return provider;
}

describe('Enhanced Preview Smoke Tests', function() {
    this.timeout(60000);

    let testTempDir;
    let testMarkdownFile;

    before(async function() {
        const extension = getExtension();
        const expectedExtensionId = `${extension.packageJSON.publisher}.${extension.packageJSON.name}`;
        assert.strictEqual(extension.id, expectedExtensionId, 'Extension identifier should match the published package');

        if (extension && !extension.isActive) {
            await extension.activate();
        }
        assert.ok(extension.isActive, 'Extension should be active before preview smoke checks');

        testTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'markdown-navigator-'));
        const testFilePath = path.join(testTempDir, 'enhanced-preview-smoke.md');
        const testContent = [
            '# Enhanced Preview Smoke',
            '',
            'This markdown file exercises the durable enhanced-preview smoke path.',
            '',
            '## Code Sample',
            '',
            '```js',
            'function smoke() {',
            '    return "ok";',
            '}',
            '```',
            ''
        ].join('\n');

        await vscode.workspace.fs.writeFile(vscode.Uri.file(testFilePath), Buffer.from(testContent, 'utf8'));
        testMarkdownFile = vscode.Uri.file(testFilePath);
    });

    after(async function() {
        if (testTempDir) {
            await fs.promises.rm(testTempDir, { recursive: true, force: true });
        }
    });

    it('opens enhanced preview for a markdown file without errors', async function() {
        try {
            const document = await vscode.workspace.openTextDocument(testMarkdownFile);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('markdown-navigator.openEnhancedPreview', testMarkdownFile);
            await new Promise(resolve => setTimeout(resolve, 1500));
            assert.ok(true, 'Enhanced preview opened successfully');
        } catch (error) {
            assert.fail(`Enhanced preview failed to open: ${error.message}`);
        }
    });

    it('opens enhanced preview at a header without errors', async function() {
        try {
            const document = await vscode.workspace.openTextDocument(testMarkdownFile);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand(
                'markdown-navigator.openEnhancedPreviewAtHeader',
                testMarkdownFile,
                5,
                'Code Sample'
            );
            await new Promise(resolve => setTimeout(resolve, 1500));
            assert.ok(true, 'Enhanced preview header navigation opened successfully');
        } catch (error) {
            assert.fail(`Enhanced preview header navigation failed: ${error.message}`);
        }
    });

    it('toggles enhanced preview debug mode without errors', async function() {
        try {
            await vscode.commands.executeCommand('markdown-navigator.toggleEnhancedPreviewDebug');
            await new Promise(resolve => setTimeout(resolve, 250));
            await vscode.commands.executeCommand('markdown-navigator.toggleEnhancedPreviewDebug');
            assert.ok(true, 'Debug mode toggle worked successfully');
        } catch (error) {
            assert.fail(`Debug mode toggle failed: ${error.message}`);
        }
    });

    it('generates hardened preview HTML with sanitized content and narrowed resource roots', function() {
        const provider = createProviderForHtmlTests(testMarkdownFile);
        const sanitizedMarkup = provider.sanitizeRenderedHtml([
            '<h1>Safe</h1>',
            '<img src="https://example.com/test.png" onerror="alert(1)">',
            '<script>alert(1)</script>'
        ].join(''));

        assert.ok(!sanitizedMarkup.includes('<script'), 'Rendered preview markup should strip script tags');
        assert.ok(!sanitizedMarkup.includes('onerror='), 'Rendered preview markup should strip event handler attributes');

        const html = provider.generateHtmlPage(sanitizedMarkup);
        assert.ok(html.includes('Content-Security-Policy'), 'Generated preview HTML should include a CSP');
        assert.ok(html.includes('webview:enhanced-preview-webview.css'), 'Generated preview HTML should include the extracted base stylesheet');
        assert.ok(!html.includes('webview:default.css'), 'Generated preview HTML should not load the retired custom theme stylesheet');
        assert.ok(!html.includes('webview:cfml-syntax.css'), 'Generated preview HTML should not load extension-owned CFML CSS');
        assert.ok(html.includes('webview:enhanced-preview-webview.js'), 'Generated preview HTML should load the extracted webview script');
        assert.ok(!html.includes('window.acquireVsCodeApi()'), 'Generated preview HTML should not embed executable inline script');

        const rootPaths = provider.getLocalResourceRoots().map(uri => path.normalize(uri.fsPath));
        assert.ok(rootPaths.includes(path.normalize(path.dirname(testMarkdownFile.fsPath))), 'Preview roots should include the markdown file directory');
        assert.ok(rootPaths.includes(path.normalize(path.join(__dirname, '..', 'styles'))), 'Preview roots should include the styles directory');
        assert.ok(rootPaths.includes(path.normalize(path.join(__dirname, '..', 'webviews'))), 'Preview roots should include the extracted webview script directory');
        assert.ok(!rootPaths.includes(path.normalize(path.join(__dirname, '..'))), 'Preview roots should not include the broad extension root');
    });
});
