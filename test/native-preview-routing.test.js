const assert = require('assert');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

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

function createTestUri(fileName) {
    return vscode.Uri.file(path.join(os.tmpdir(), fileName));
}

async function describePreviewRoute(request) {
    return vscode.commands.executeCommand('markdown-navigator.__test.describePreviewRoute', request);
}

async function withPreviewMode(mode, callback) {
    const configuration = vscode.workspace.getConfiguration('markdownNavigator');
    const originalMode = configuration.get('previewMode');

    await configuration.update('previewMode', mode, vscode.ConfigurationTarget.Global);

    try {
        return await callback();
    } finally {
        await configuration.update('previewMode', originalMode, vscode.ConfigurationTarget.Global);
    }
}

describe('Native Preview Routing Smoke Tests', function() {
    this.timeout(30000);

    before(async function() {
        const extension = getExtension();
        const expectedExtensionId = `${extension.packageJSON.publisher}.${extension.packageJSON.name}`;
        assert.strictEqual(extension.id, expectedExtensionId, 'Extension identifier should match the published package');

        if (!extension.isActive) {
            await extension.activate();
        } else {
            await extension.activate();
        }

        assert.ok(extension.isActive, 'Extension should be active before routing smoke checks');
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('markdown-navigator.__test.describePreviewRoute'), 'Native preview route test helper command should be registered');
    });

    it('keeps enhanced as the declared default route and preserves the enhanced fallback command', async function() {
        const extension = getExtension();
        const previewModeContribution = extension.packageJSON.contributes.configuration.properties['markdownNavigator.previewMode'];
        const targetUri = createTestUri('native-preview-default-smoke.md');

        assert.strictEqual(previewModeContribution.default, 'enhanced', 'previewMode should default to enhanced during the spike');

        const genericRoute = await withPreviewMode('enhanced', async () => describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString()
        }));
        const headerRoute = await withPreviewMode('enhanced', async () => describePreviewRoute({
            kind: 'header',
            uri: targetUri.toString(),
            lineNumber: 7,
            headerText: 'Native Preview Spike'
        }));

        assert.deepStrictEqual(
            [genericRoute.command, headerRoute.command],
            [
                'markdown-navigator.openEnhancedPreview',
                'markdown-navigator.openEnhancedPreviewAtHeader'
            ],
            'Enhanced mode should keep routing through the existing enhanced preview commands'
        );
    });

    it('routes native generic preview opens through VS Code markdown preview commands', async function() {
        const targetUri = createTestUri('native-preview-generic-smoke.md');

        const standardRoute = await withPreviewMode('native', async () => describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString()
        }));
        const sideRoute = await withPreviewMode('native', async () => describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString(),
            toSide: true
        }));

        assert.strictEqual(standardRoute.command, 'markdown.showPreview', 'Native preview mode should use markdown.showPreview for standard opens');
        assert.strictEqual(standardRoute.args[0], targetUri.toString(), 'Standard native preview should target the requested URI');
        assert.strictEqual(sideRoute.command, 'markdown.showPreviewToSide', 'Native preview mode should use markdown.showPreviewToSide for side opens');
        assert.strictEqual(sideRoute.args[0], targetUri.toString(), 'Side native preview should target the requested URI');
    });

    it('routes native header and fragment preview requests through fragment URIs', async function() {
        const targetUri = createTestUri('native-preview-fragment-smoke.md');
        const explicitFragmentUri = targetUri.with({ fragment: 'manual-fragment' });

        const headerRoute = await withPreviewMode('native', async () => describePreviewRoute({
            kind: 'header',
            uri: targetUri.toString(),
            lineNumber: 12,
            headerText: 'Section To Visit'
        }));
        const fragmentRoute = await withPreviewMode('native', async () => describePreviewRoute({
            kind: 'fragment',
            uri: explicitFragmentUri.toString()
        }));

        assert.strictEqual(headerRoute.command, 'markdown.showPreview', 'Native header routing should open VS Code preview');
        assert.strictEqual(headerRoute.args[0], targetUri.with({ fragment: 'section-to-visit' }).toString(), 'Native header routing should convert the header into a fragment URI');
        assert.strictEqual(fragmentRoute.command, 'markdown.showPreview', 'Explicit fragment routing should also use VS Code preview');
        assert.strictEqual(fragmentRoute.args[0], explicitFragmentUri.toString(), 'Explicit fragment routing should preserve the requested fragment URI');
    });
});