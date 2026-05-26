const assert = require('assert');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

const packageJson = require('../package.json');

const EXTENSION_LOOKUP_IDS = [
    `${packageJson.publisher}.${packageJson.name}`,
    `${String(packageJson.publisher).toLowerCase()}.${packageJson.name}`
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
        assert.ok(commands.includes('markdown-navigator.__test.getPreviewTrackingState'), 'Preview tracking test helper command should be registered');
    });

    it('removes the legacy enhanced preview commands and settings surface', async function() {
        const extension = getExtension();
        const declaredCommands = extension.packageJSON.contributes.commands.map(command => command.command);
        const configurationProperties = extension.packageJSON.contributes.configuration?.properties ?? {};
        const commands = await vscode.commands.getCommands(true);

        assert.ok(!declaredCommands.includes('markdown-navigator.openEnhancedPreview'), 'Legacy enhanced preview open command should not be declared');
        assert.ok(!declaredCommands.includes('markdown-navigator.toggleEnhancedPreviewDebug'), 'Legacy enhanced preview debug command should not be declared');
        assert.ok(!commands.includes('markdown-navigator.openEnhancedPreview'), 'Legacy enhanced preview open command should not be registered');
        assert.ok(!commands.includes('markdown-navigator.openEnhancedPreviewAtHeader'), 'Legacy enhanced preview header command should not be registered');
        assert.ok(!commands.includes('markdown-navigator.toggleEnhancedPreviewDebug'), 'Legacy enhanced preview debug command should not be registered');
        assert.ok(!configurationProperties['markdownNavigator.previewMode'], 'Legacy previewMode setting should be removed');
        assert.ok(!configurationProperties['markdownNavigator.enhancedPreview.debugMode'], 'Legacy enhanced preview debug setting should be removed');
    });

    it('routes native generic preview opens through VS Code markdown preview commands', async function() {
        const targetUri = createTestUri('native-preview-generic-smoke.md');

        const standardRoute = await describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString()
        });
        const lockedRoute = await describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString(),
            locked: true
        });
        const sideRoute = await describePreviewRoute({
            kind: 'open',
            uri: targetUri.toString(),
            toSide: true
        });

        assert.strictEqual(standardRoute.mode, 'native', 'Standard preview routing should report native mode');
        assert.strictEqual(standardRoute.command, 'markdown.showPreview', 'Native preview mode should use markdown.showPreview for standard opens');
        assert.strictEqual(standardRoute.args[0], targetUri.toString(), 'Standard native preview should target the requested URI');
        assert.strictEqual(lockedRoute.command, 'markdown.showPreview', 'Locked in-place preview routing should still use markdown.showPreview');
        assert.strictEqual(lockedRoute.args[0], targetUri.toString(), 'Locked in-place preview routing should still target the requested URI');
        assert.deepStrictEqual(lockedRoute.args[2], { locked: true }, 'Locked in-place preview routing should pass the native preview lock option');
        assert.strictEqual(sideRoute.mode, 'native', 'Side preview routing should report native mode');
        assert.strictEqual(sideRoute.command, 'markdown.showPreviewToSide', 'Native preview mode should use markdown.showPreviewToSide for side opens');
        assert.strictEqual(sideRoute.args[0], targetUri.toString(), 'Side native preview should target the requested URI');
    });

    it('routes cross-document tree preview opens directly to the target markdown URI', async function() {
        const currentPreviewedUri = createTestUri('native-preview-current-smoke.md');
        const targetUri = createTestUri('native-preview-target-smoke.md');

        const changedDocumentRoute = await describePreviewRoute({
            kind: 'tree-open',
            uri: targetUri.toString(),
            currentPreviewedUri: currentPreviewedUri.toString()
        });
        const sameDocumentRoute = await describePreviewRoute({
            kind: 'tree-open',
            uri: targetUri.toString(),
            currentPreviewedUri: targetUri.toString()
        });

        assert.strictEqual(changedDocumentRoute.command, 'markdown.showPreview', 'Tree-preview opens should still route through the native preview command');
        assert.strictEqual(changedDocumentRoute.args[0], targetUri.toString(), 'Cross-document tree preview opens should still target the plain markdown document URI');
        assert.strictEqual(changedDocumentRoute.targetUri, targetUri.toString(), 'Cross-document tree preview opens should not rewrite the target URI');
        assert.strictEqual(sameDocumentRoute.args[0], targetUri.toString(), 'Same-document tree preview opens should not force a top-of-file line anchor');
        assert.strictEqual(sameDocumentRoute.targetUri, targetUri.toString(), 'Same-document tree preview opens should leave the target URI unchanged');
    });

    it('routes native header and fragment preview requests through fragment URIs', async function() {
        const targetUri = createTestUri('native-preview-fragment-smoke.md');
        const explicitFragmentUri = targetUri.with({ fragment: 'manual-fragment' });

        const headerRoute = await describePreviewRoute({
            kind: 'header',
            uri: targetUri.toString(),
            lineNumber: 12,
            headerText: 'Section To Visit'
        });
        const fragmentRoute = await describePreviewRoute({
            kind: 'fragment',
            uri: explicitFragmentUri.toString()
        });

        assert.strictEqual(headerRoute.mode, 'native', 'Native header routing should report native mode');
        assert.strictEqual(headerRoute.command, 'markdown.showPreview', 'Native header routing should open VS Code preview');
        assert.strictEqual(headerRoute.args[0], targetUri.with({ fragment: 'section-to-visit' }).toString(), 'Native header routing should convert the header into a fragment URI');
        assert.strictEqual(fragmentRoute.mode, 'native', 'Explicit fragment routing should report native mode');
        assert.strictEqual(fragmentRoute.command, 'markdown.showPreview', 'Explicit fragment routing should also use VS Code preview');
        assert.strictEqual(fragmentRoute.args[0], explicitFragmentUri.toString(), 'Explicit fragment routing should preserve the requested fragment URI');
    });
});