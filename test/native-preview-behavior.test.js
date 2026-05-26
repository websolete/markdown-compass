const assert = require('assert');
const fs = require('fs/promises');
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

async function describePreviewRoute(request) {
    return vscode.commands.executeCommand('markdown-navigator.__test.describePreviewRoute', request);
}

async function getPreviewTrackingState() {
    return vscode.commands.executeCommand('markdown-navigator.__test.getPreviewTrackingState');
}

async function waitFor(resolveValue, options = {}) {
    const timeoutMs = options.timeoutMs ?? 5000;
    const intervalMs = options.intervalMs ?? 100;
    const description = options.description ?? 'condition';
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const value = await resolveValue();
        if (value) {
            return value;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for ${description}`);
}

async function createFixtureSet() {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-navigator-native-preview-'));
    const sourcePath = path.join(fixtureRoot, 'native-preview-source.md');
    const targetPath = path.join(fixtureRoot, 'native-preview-target.md');

    await fs.writeFile(
        targetPath,
        [
            '# Native Preview Target',
            '',
            '## Purpose',
            '',
            'Target body for cross-file fragment checks.'
        ].join('\n'),
        'utf8'
    );

    await fs.writeFile(
        sourcePath,
        [
            '# Native Preview Source',
            '',
            '[Relative markdown link](./native-preview-target.md)',
            '',
            '[Cross-file fragment](./native-preview-target.md#purpose)',
            '',
            '[Same-file fragment](#same-file-target)',
            '',
            '## Same-file Target',
            '',
            'Source body for same-file fragment checks.'
        ].join('\n'),
        'utf8'
    );

    return {
        fixtureRoot,
        sourceUri: vscode.Uri.file(sourcePath),
        targetUri: vscode.Uri.file(targetPath)
    };
}

async function disposeFixtureSet(fixtures) {
    if (fixtures?.fixtureRoot) {
        await fs.rm(fixtures.fixtureRoot, { recursive: true, force: true });
    }
}

async function withConfigurationValues(updates, callback) {
    const configuration = vscode.workspace.getConfiguration();
    const originals = new Map();

    for (const [key, value] of Object.entries(updates)) {
        originals.set(key, configuration.get(key));
        await configuration.update(key, value, vscode.ConfigurationTarget.Global);
    }

    try {
        return await callback();
    } finally {
        for (const [key, value] of originals.entries()) {
            await configuration.update(key, value, vscode.ConfigurationTarget.Global);
        }
    }
}

function summarizeTab(tab) {
    if (!tab) {
        return null;
    }

    const input = tab.input;
    return {
        label: tab.label,
        constructorName: input?.constructor?.name ?? null,
        uri: input?.uri?.toString?.() ?? null,
        viewType: typeof input?.viewType === 'string' ? input.viewType : null
    };
}

function expectedPreviewLabel(uri) {
    return `Preview ${path.basename(uri.fsPath)}`;
}

function getAllPreviewTabs() {
    return vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .map(summarizeTab)
        .filter((tab) => tab && isMarkdownPreviewTab(tab));
}

function getAllNonPreviewTabsForUri(expectedUri) {
    return vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .map(summarizeTab)
        .filter((tab) => tab && !isMarkdownPreviewTab(tab) && tabTargetsUri(tab, expectedUri));
}

function getAllTabs() {
    return vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .map(summarizeTab)
        .filter(Boolean);
}

function getActivePreviewTab() {
    const summary = summarizeTab(vscode.window.tabGroups.activeTabGroup?.activeTab);
    return isMarkdownPreviewTab(summary) ? summary : null;
}

function isMarkdownPreviewTab(tab) {
    if (!tab) {
        return false;
    }

    if (typeof tab.viewType === 'string' && tab.viewType.includes('markdown.preview')) {
        return true;
    }

    return tab.constructorName === 'TabInputWebview' || tab.constructorName === 'TabInputCustom';
}

function tabTargetsUri(tab, expectedUri) {
    if (tab?.uri) {
        return vscode.Uri.parse(tab.uri).fsPath.toLowerCase() === expectedUri.fsPath.toLowerCase();
    }

    return typeof tab?.label === 'string' && tab.label.includes(path.basename(expectedUri.fsPath));
}

async function closeAllEditors() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

describe('Native Preview Behavior Validation', function() {
    this.timeout(45000);

    before(async function() {
        const extension = getExtension();
        if (!extension.isActive) {
            await extension.activate();
        } else {
            await extension.activate();
        }
    });

    afterEach(async function() {
        await closeAllEditors();
    });

    it('opens a native preview tab from the tree-preview command path', async function() {
        const fixtures = await createFixtureSet();

        try {
            await closeAllEditors();
            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', { uri: fixtures.sourceUri });

            const activePreviewTab = await waitFor(
                () => getActivePreviewTab(),
                { description: 'active native preview tab for tree-open path' }
            );

            assert.ok(
                tabTargetsUri(activePreviewTab, fixtures.sourceUri),
                `Expected active native preview to target ${expectedPreviewLabel(fixtures.sourceUri)}, got ${JSON.stringify(activePreviewTab)}`
            );
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('opens a second preview tab when the tree context command requests a new tab', async function() {
        const fixtures = await createFixtureSet();

        try {
            await closeAllEditors();

            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', { uri: fixtures.sourceUri });
            await waitFor(
                () => {
                    const tab = getActivePreviewTab();
                    return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                },
                { description: 'initial source preview tab before opening a new preview tab' }
            );

            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFileInNewTab', { uri: fixtures.targetUri });

            const previewTabs = await waitFor(
                () => {
                    const tabs = getAllPreviewTabs();
                    const hasSourcePreview = tabs.some((tab) => tabTargetsUri(tab, fixtures.sourceUri));
                    const hasTargetPreview = tabs.some((tab) => tabTargetsUri(tab, fixtures.targetUri));
                    return hasSourcePreview && hasTargetPreview ? tabs : null;
                },
                { description: 'both source and target preview tabs after opening a new tree preview tab' }
            );

            assert.ok(
                previewTabs.some((tab) => tabTargetsUri(tab, fixtures.sourceUri)),
                `Opening a new preview tab should keep the existing source preview open; tabs: ${JSON.stringify(previewTabs)}`
            );
            assert.ok(
                previewTabs.some((tab) => tabTargetsUri(tab, fixtures.targetUri)),
                `Opening a new preview tab should also open the requested target preview; tabs: ${JSON.stringify(previewTabs)}`
            );
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('opens native preview targets for relative and fragment markdown destinations', async function() {
        const fixtures = await createFixtureSet();

        try {
            await withConfigurationValues({
                'markdown.preview.openMarkdownLinks': 'inPreview',
                'markdown.links.openLocation': 'currentGroup'
            }, async () => {
                await closeAllEditors();

                await vscode.commands.executeCommand('markdown.showPreview', fixtures.sourceUri);
                await waitFor(
                    () => {
                        const tab = getActivePreviewTab();
                        return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                    },
                    { description: 'source native preview tab' }
                );

                await vscode.commands.executeCommand('markdown.showPreview', fixtures.targetUri);
                const relativeTargetTab = await waitFor(
                    () => {
                        const tab = getActivePreviewTab();
                        return tabTargetsUri(tab, fixtures.targetUri) ? tab : null;
                    },
                    { description: 'relative-link target preview tab' }
                );

                assert.ok(relativeTargetTab, 'Relative markdown target should open in the native preview');

                await vscode.commands.executeCommand('markdown.showPreview', fixtures.targetUri.with({ fragment: 'purpose' }));
                const crossFileFragmentTab = await waitFor(
                    () => {
                        const tab = getActivePreviewTab();
                        return tabTargetsUri(tab, fixtures.targetUri) ? tab : null;
                    },
                    { description: 'cross-file fragment preview tab' }
                );

                assert.ok(crossFileFragmentTab, 'Cross-file fragment target should open in the native preview');

                await vscode.commands.executeCommand('markdown.showPreview', fixtures.sourceUri.with({ fragment: 'same-file-target' }));
                const sameFileFragmentTab = await waitFor(
                    () => {
                        const tab = getActivePreviewTab();
                        return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                    },
                    { description: 'same-file fragment preview tab' }
                );

                assert.ok(sameFileFragmentTab, 'Same-file fragment target should stay in the native preview for the same document');
            });
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('does not leave a source editor tab open when tree preview switches to another document', async function() {
        const fixtures = await createFixtureSet();

        try {
            await closeAllEditors();

            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', { uri: fixtures.sourceUri });
            await waitFor(
                () => {
                    const tab = getActivePreviewTab();
                    return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                },
                { description: 'initial source preview tab before tree switch' }
            );

            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', { uri: fixtures.targetUri });
            await waitFor(
                () => {
                    const tab = getActivePreviewTab();
                    return tabTargetsUri(tab, fixtures.targetUri) ? tab : null;
                },
                { description: 'target preview tab after tree switch' }
            );

            const nonPreviewTargetTabs = getAllNonPreviewTabsForUri(fixtures.targetUri);
            assert.strictEqual(
                nonPreviewTargetTabs.length,
                0,
                `Tree preview switch should not leave a source editor tab open for ${fixtures.targetUri.toString()}; tabs: ${JSON.stringify(getAllTabs())}`
            );
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('syncs tree selections and current-document headers when preview navigation changes documents', async function() {
        const fixtures = await createFixtureSet();
        const favoriteNode = {
            label: path.basename(fixtures.targetUri.fsPath),
            uri: fixtures.targetUri,
            type: 'file',
            isMarkdownFile: true
        };

        try {
            await closeAllEditors();
            await vscode.commands.executeCommand('markdown-navigator.refresh');
            await vscode.commands.executeCommand('markdown-navigator.addToFavorites', favoriteNode);

            await vscode.commands.executeCommand('markdown.showPreview', fixtures.sourceUri);
            await waitFor(
                async () => {
                    const state = await getPreviewTrackingState();
                    return state.lastPreviewedMarkdownFile === fixtures.sourceUri.toString() ? state : null;
                },
                { description: 'source preview state sync' }
            );

            await vscode.commands.executeCommand('markdown.showPreview', fixtures.targetUri);
            let lastObservedSyncState = null;
            let syncedState;

            try {
                syncedState = await waitFor(
                    async () => {
                        const state = await getPreviewTrackingState();
                        lastObservedSyncState = state;
                        return state.lastPreviewedMarkdownFile === fixtures.targetUri.toString()
                            && state.currentHeaderFile === fixtures.targetUri.toString()
                            && state.activePreviewUri === fixtures.targetUri.toString()
                            && state.lastMainTreeSyncTargetUri === fixtures.targetUri.toString()
                            && state.lastFavoriteSyncTargetUri === fixtures.targetUri.toString()
                            ? state
                            : null;
                    },
                    { description: 'target preview state sync' }
                );
            } catch {
                throw new Error(`Timed out waiting for target preview state sync. Last state: ${JSON.stringify(lastObservedSyncState)}`);
            }

            assert.strictEqual(syncedState.activePreviewUri, fixtures.targetUri.toString(), 'Active preview tracking should follow the linked markdown target');
            assert.strictEqual(syncedState.lastFavoriteSyncTargetUri, fixtures.targetUri.toString(), 'Favorites sync should target the linked markdown document');
        } finally {
            await vscode.commands.executeCommand('markdown-navigator.removeFromFavorites', favoriteNode);
            await disposeFixtureSet(fixtures);
        }
    });

    it('preserves a locked native preview while opening a second markdown preview target', async function() {
        const fixtures = await createFixtureSet();

        try {
            await closeAllEditors();

            await vscode.commands.executeCommand('markdown.showLockedPreviewToSide', fixtures.sourceUri);
            await waitFor(
                () => getAllPreviewTabs().find((tab) => tabTargetsUri(tab, fixtures.sourceUri)),
                { description: 'locked native preview tab' }
            );

            await vscode.commands.executeCommand('markdown.showPreview', fixtures.targetUri);

            const previewTabs = await waitFor(
                () => {
                    const tabs = getAllPreviewTabs();
                    const hasSource = tabs.some((tab) => tabTargetsUri(tab, fixtures.sourceUri));
                    const hasTarget = tabs.some((tab) => tabTargetsUri(tab, fixtures.targetUri));
                    return hasSource && hasTarget ? tabs : null;
                },
                { description: 'locked and unlocked native preview tabs after second open' }
            );

            assert.ok(
                previewTabs.some((tab) => tabTargetsUri(tab, fixtures.sourceUri)),
                `Locked preview should remain open for ${fixtures.sourceUri.toString()}; tabs: ${JSON.stringify(previewTabs)}`
            );
            assert.ok(
                previewTabs.some((tab) => tabTargetsUri(tab, fixtures.targetUri)),
                `Second native preview should open for ${fixtures.targetUri.toString()}; tabs: ${JSON.stringify(previewTabs)}`
            );
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('navigates to a header through goToHeader without requiring enhanced preview', async function() {
        const fixtures = await createFixtureSet();

        try {
            await closeAllEditors();

            const headerRoute = await describePreviewRoute({
                kind: 'header',
                uri: fixtures.sourceUri.toString(),
                lineNumber: 9,
                headerText: 'Same-file Target'
            });

            assert.strictEqual(
                headerRoute.args[0],
                fixtures.sourceUri.with({ fragment: 'same-file-target' }).toString(),
                'Native header routing should target the expected fragment URI before goToHeader executes'
            );

            await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', { uri: fixtures.sourceUri });

            await waitFor(
                () => {
                    const tab = getActivePreviewTab();
                    return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                },
                { description: 'native preview tab before goToHeader' }
            );

            await vscode.commands.executeCommand('markdown-navigator.goToHeader', 9);

            const activePreviewTab = await waitFor(
                () => {
                    const tab = getActivePreviewTab();
                    return tabTargetsUri(tab, fixtures.sourceUri) ? tab : null;
                },
                { description: 'native preview tab after goToHeader' }
            );

            assert.ok(activePreviewTab, 'goToHeader should keep native preview active for the current document');
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });
});