const assert = require('assert');
const vscode = require('vscode');

const packageJson = require('../package.json');

const EXTENSION_LOOKUP_IDS = [
    `${packageJson.publisher}.${packageJson.name}`,
    `${String(packageJson.publisher).toLowerCase()}.${packageJson.name}`
];
const releaseGateCommands = [
    'markdown-compass.refresh',
    'markdown-compass.toggleBrowseMode',
    'markdown-compass.refreshHeaders',
    'markdown-compass.previewMarkdownFile',
    'markdown-compass.previewMarkdownFileInNewTab',
    'markdown-compass.addToFavorites',
    'markdown-compass.removeFromFavorites'
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

function getDeclaredCommands(extension) {
    return extension.packageJSON.contributes.commands.map(command => command.command);
}

describe('Command Registry Validation Tests', function() {
    this.timeout(30000);

    it('uses the current published extension identifier and activates', async function() {
        const extension = getExtension();
        const expectedExtensionId = `${extension.packageJSON.publisher}.${extension.packageJSON.name}`;
        assert.strictEqual(extension.id, expectedExtensionId, 'Extension identifier should match the published package');

        if (!extension.isActive) {
            await extension.activate();
        }
        assert.ok(extension.isActive, 'Extension should be active');
    });

    it('declares and registers the release-gate command surface', async function() {
        const extension = getExtension();
        const declaredCommands = getDeclaredCommands(extension);
        const commands = await vscode.commands.getCommands(true);

        for (const requiredCommand of releaseGateCommands) {
            assert.ok(
                declaredCommands.includes(requiredCommand),
                `Command "${requiredCommand}" should be declared in package.json`
            );
            assert.ok(
                commands.includes(requiredCommand), 
                `Command "${requiredCommand}" should be registered`
            );
        }
    });

    it('steps the heading icon style from the Current Document title-bar button', async function() {
        const config = () => vscode.workspace.getConfiguration('markdownCompass');
        const commands = await vscode.commands.getCommands(true);
        for (const style of ['bars', 'levels', 'sections']) {
            assert.ok(commands.includes(`markdown-compass.headingIconStyle.${style}`), `Button command for ${style} should be registered`);
        }

        const original = config().inspect('headingIcons')?.globalValue;
        try {
            await config().update('headingIcons', undefined, vscode.ConfigurationTarget.Global);
            const seen = [];
            for (let i = 0; i < 3; i++) {
                await vscode.commands.executeCommand('markdown-compass.headingIconStyle.bars');
                seen.push(config().get('headingIcons'));
            }
            assert.deepStrictEqual(seen, ['levels', 'sections', 'bars'], 'Each click should move to the next style, starting from the bars default');
        } finally {
            await config().update('headingIcons', original, vscode.ConfigurationTarget.Global);
        }
    });

    it('executes tree-view-critical refresh commands without errors', async function() {
        try {
            await vscode.commands.executeCommand('markdown-compass.refresh');
            await vscode.commands.executeCommand('markdown-compass.refreshHeaders');
            assert.ok(true, 'Tree-view refresh commands executed successfully');
        } catch (error) {
            assert.fail(`Tree-view refresh commands failed: ${error.message}`);
        }
    });
});
