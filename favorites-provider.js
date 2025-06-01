/**
 * Favorites functionality for Markdown Navigator
 */
const vscode = require('vscode');

/**
 * TreeDataProvider for the Favorites view
 */
class FavoritesTreeDataProvider {
    constructor(context, mainTreeProvider) {
        this._context = context;
        this._mainTreeProvider = mainTreeProvider;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._favorites = this._loadFavorites();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.resourceUri = element.uri;
        treeItem.tooltip = element.uri.fsPath;
        treeItem.iconPath = new vscode.ThemeIcon('star-full');        treeItem.contextValue = 'markdownFile';
        
        // Command to open the file
        treeItem.command = {
            command: 'markdown-navigator.previewMarkdownFile',
            title: 'Preview Markdown File',
            arguments: [element]
        };

        return treeItem;
    }

    getChildren(element) {
        if (!element) {
            return this._favorites;
        }
        return [];
    }

    /**
     * Add a file to favorites
     */
    async addToFavorites(node) {
        if (!node || !node.uri) {
            return;
        }

        // Check if already in favorites
        const existing = this._favorites.find(fav => fav.uri.fsPath === node.uri.fsPath);
        if (existing) {
            vscode.window.showInformationMessage(`${node.label} is already in favorites`);
            return;
        }

        // Add to favorites
        this._favorites.push({
            label: node.label,
            uri: node.uri,
            type: 'file'
        });

        this._saveFavorites();
        this.refresh();
        vscode.window.showInformationMessage(`Added ${node.label} to favorites`);
    }

    /**
     * Remove a file from favorites
     */
    async removeFromFavorites(node) {
        if (!node || !node.uri) {
            return;
        }

        const index = this._favorites.findIndex(fav => fav.uri.fsPath === node.uri.fsPath);
        if (index === -1) {
            vscode.window.showWarningMessage(`${node.label} is not in favorites`);
            return;
        }

        this._favorites.splice(index, 1);
        this._saveFavorites();
        this.refresh();
        vscode.window.showInformationMessage(`Removed ${node.label} from favorites`);
    }

    /**
     * Load favorites from storage
     */
    _loadFavorites() {
        const stored = this._context.globalState.get('markdownNavigator.favorites', []);
        return stored.map(item => ({
            label: item.label,
            uri: vscode.Uri.parse(item.uri),
            type: item.type
        }));
    }

    /**
     * Save favorites to storage
     */
    _saveFavorites() {
        const toStore = this._favorites.map(item => ({
            label: item.label,
            uri: item.uri.toString(),
            type: item.type
        }));
        this._context.globalState.update('markdownNavigator.favorites', toStore);
    }
}

module.exports = FavoritesTreeDataProvider;
