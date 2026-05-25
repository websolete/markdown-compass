const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const FavoritesTreeDataProviderModule = require('../dist/favorites-provider');

const FavoritesTreeDataProvider = FavoritesTreeDataProviderModule.default || FavoritesTreeDataProviderModule;

function createContext(storage) {
    return {
        globalState: {
            get(key, defaultValue) {
                return storage.has(key) ? storage.get(key) : defaultValue;
            },
            update(key, value) {
                storage.set(key, value);
                return Promise.resolve();
            }
        }
    };
}

describe('Favorites Provider Smoke Tests', function() {
    this.timeout(30000);

    it('adds, persists, reloads, and removes favorites without errors', async function() {
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-navigator-favorites-'));
        const markdownPath = path.join(tempDirectory, 'favorite.md');
        const storage = new Map();
        const node = {
            label: 'favorite.md',
            uri: vscode.Uri.file(markdownPath),
            isMarkdownFile: true
        };

        fs.writeFileSync(markdownPath, '# Favorite Title\n\nBody content\n', 'utf8');

        const originalShowInformationMessage = vscode.window.showInformationMessage;
        const originalShowWarningMessage = vscode.window.showWarningMessage;
        vscode.window.showInformationMessage = async () => undefined;
        vscode.window.showWarningMessage = async () => undefined;

        try {
            const provider = new FavoritesTreeDataProvider(createContext(storage), {});
            await provider.addToFavorites(node);

            assert.strictEqual(provider._favorites.length, 1, 'Favorite should be added to the in-memory list');
            assert.strictEqual(
                provider._favorites[0].firstLevelHeader,
                'Favorite Title',
                'Favorite should capture the first-level header from the markdown file'
            );
            assert.strictEqual(storage.get('markdownNavigator.favorites').length, 1, 'Favorite should persist to global state');

            const reloadedProvider = new FavoritesTreeDataProvider(createContext(storage), {});
            assert.strictEqual(reloadedProvider._favorites.length, 1, 'Persisted favorites should reload into a new provider');
            assert.strictEqual(
                reloadedProvider._favorites[0].firstLevelHeader,
                'Favorite Title',
                'Reloaded favorites should preserve extracted header metadata'
            );

            await reloadedProvider.removeFromFavorites(node);
            assert.strictEqual(reloadedProvider._favorites.length, 0, 'Favorite should be removed from the provider');
            assert.strictEqual(storage.get('markdownNavigator.favorites').length, 0, 'Favorite removal should persist to global state');
        } finally {
            vscode.window.showInformationMessage = originalShowInformationMessage;
            vscode.window.showWarningMessage = originalShowWarningMessage;
            fs.rmSync(tempDirectory, { recursive: true, force: true });
        }
    });
});