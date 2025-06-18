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
    }    refresh() {
        this._onDidChangeTreeData.fire();
    }
    
    async getTreeItem(element) {
        // Determine display label and description based on header content
        let displayLabel = element.label;
        let description = '';
        
        // If we have a header, use it as the main label and filename as description
        if (element.firstLevelHeader) {
            displayLabel = element.firstLevelHeader;
            description = element.label;
        }
        
        const treeItem = new vscode.TreeItem(displayLabel, vscode.TreeItemCollapsibleState.None);
        treeItem.resourceUri = element.uri;
        treeItem.description = description;
        
        // Enhanced tooltip with header and file information
        let tooltip = element.uri.fsPath;
        if (element.firstLevelHeader) {
            tooltip = `${element.firstLevelHeader}\nFile: ${element.label}\n\n${tooltip}`;
        }        treeItem.tooltip = tooltip;
        
        treeItem.iconPath = new vscode.ThemeIcon('star-full');
        treeItem.contextValue = 'markdownFile';
        
        // Command to open the file with enhanced preview
        treeItem.command = {
            command: 'markdown-navigator.openEnhancedPreview',
            title: 'Open Enhanced Preview',
            arguments: [element]
        };

        return treeItem;
    }

    getChildren(element) {
        if (!element) {
            return this._favorites;        }
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

        // Extract first level header if it's not already available
        let firstLevelHeader = node.firstLevelHeader;
        if (!firstLevelHeader && node.isMarkdownFile) {
            try {
                const content = await vscode.workspace.fs.readFile(node.uri);
                const text = Buffer.from(content).toString('utf8');
                firstLevelHeader = this._extractFirstLevelHeader(text);
            } catch (error) {
                console.error(`Error reading file ${node.uri.fsPath} for header extraction:`, error);
            }
        }

        // Add to favorites with header information
        const favoriteItem = {
            label: node.label,
            uri: node.uri,
            type: 'file'
        };

        if (firstLevelHeader) {
            favoriteItem.firstLevelHeader = firstLevelHeader;
        }

        this._favorites.push(favoriteItem);

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
        this.refresh();        vscode.window.showInformationMessage(`Removed ${node.label} from favorites`);
    }
    
    /**
     * Load favorites from storage
     */
    _loadFavorites() {
        const stored = this._context.globalState.get('markdownNavigator.favorites', []);
        return stored.map(item => ({
            label: item.label,
            uri: vscode.Uri.parse(item.uri),
            type: item.type,            firstLevelHeader: item.firstLevelHeader // Restore header information
        }));
    }
    
    /**
     * Save favorites to storage
     */
    _saveFavorites() {
        const toStore = this._favorites.map(item => ({
            label: item.label,
            uri: item.uri.toString(),
            type: item.type,
            firstLevelHeader: item.firstLevelHeader // Include header in storage
        }));
        this._context.globalState.update('markdownNavigator.favorites', toStore);
    }

    /**
     * Extract the first level 1 header from markdown content
     * @param {string} content Markdown file content
     * @returns {string|null} First H1 header text or null if none found
     */
    _extractFirstLevelHeader(content) {
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            const headerMatch = trimmedLine.match(/^#{1}\s+(.+)$/);

            if (headerMatch) {
                return headerMatch[1].trim();
            }
        }

        return null;
    }
}

module.exports = FavoritesTreeDataProvider;
