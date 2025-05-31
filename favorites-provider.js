/**
 * Favorites functionality for Markdown Navigator
 */
const vscode = require('vscode');
const path = require('path');

/**
 * TreeDataProvider for markdown file favorites
 */
class FavoritesTreeDataProvider {
    constructor(context, treeDataProvider) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._context = context;
        this._treeDataProvider = treeDataProvider;
        this._favorites = this._loadFavorites();
        this._expandedDirectories = new Set();
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Load favorites from storage
     * @returns {Array} Array of favorite file paths
     */
    _loadFavorites() {
        const favorites = this._context.globalState.get('markdownNavigator.favorites', []);
        console.log(`Loaded ${favorites.length} favorites from storage`);
        return favorites;
    }

    /**
     * Save favorites to storage
     */
    _saveFavorites() {
        this._context.globalState.update('markdownNavigator.favorites', this._favorites);
        console.log(`Saved ${this._favorites.length} favorites to storage`);
    }

    /**
     * Add a file to favorites
     * @param {object} node The file node to add
     */
    async addToFavorites(node) {
        if (!node || !node.uri) {
            return;
        }

        const filePath = node.uri.fsPath;
        
        // Check if already in favorites
        if (this._favorites.find(f => f.path === filePath)) {
            vscode.window.showInformationMessage(`"${node.label}" is already in your favorites`);
            return;
        }
        
        // Add to favorites with metadata
        this._favorites.push({
            path: filePath,
            label: node.label,
            added: new Date().toISOString()
        });
        
        // Save and refresh
        this._saveFavorites();
        this.refresh();
        
        vscode.window.showInformationMessage(`Added "${node.label}" to favorites`);
    }

    /**
     * Remove a file from favorites
     * @param {object} node The file node to remove
     */
    async removeFromFavorites(node) {
        if (!node || !node.uri) {
            return;
        }

        const filePath = node.uri.fsPath;
        const initialCount = this._favorites.length;
        
        // Remove from favorites
        this._favorites = this._favorites.filter(f => f.path !== filePath);
        
        // If something was removed, save and refresh
        if (initialCount !== this._favorites.length) {
            this._saveFavorites();
            this.refresh();
            vscode.window.showInformationMessage(`Removed "${node.label}" from favorites`);
        }
    }

    /**
     * Handle tree item expansion event
     * @param {object} element The expanded element
     */
    _onTreeItemExpanded(element) {
        if (element && element.type === 'directory') {
            const dirKey = element.uri.toString();
            this._expandedDirectories.add(dirKey);
        }
    }

    /**
     * Handle tree item collapse event
     * @param {object} element The collapsed element
     */
    _onTreeItemCollapsed(element) {
        if (element && element.type === 'directory') {
            const dirKey = element.uri.toString();
            this._expandedDirectories.delete(dirKey);
        }
    }

    /**
     * Check if a directory is currently expanded in the tree view
     * @param {object} element Directory element to check
     * @returns {boolean} True if directory is expanded
     */
    _isDirectoryExpanded(element) {
        if (!element || element.type !== 'directory') {
            return false;
        }
        return this._expandedDirectories.has(element.uri.toString());
    }

    /**
     * Get the TreeItem for the given element
     * @param {object} element
     * @returns {vscode.TreeItem}
     */
    getTreeItem(element) {
        // Create the tree item
        const treeItem = new vscode.TreeItem(
            element.label,
            element.type === 'directory' ? 
                (this._isDirectoryExpanded(element) ? 
                    vscode.TreeItemCollapsibleState.Expanded : 
                    vscode.TreeItemCollapsibleState.Collapsed) : 
                vscode.TreeItemCollapsibleState.None
        );
        
        // Set icon and context value based on type
        if (element.type === 'file') {
            treeItem.iconPath = vscode.Uri.file(path.join(this._context.extensionPath, 'icons', 'bullets', 'star.svg'));
            treeItem.contextValue = 'markdownFile';
            treeItem.command = {
                command: 'markdown-navigator.previewMarkdownFile',
                title: 'Preview Markdown File',
                arguments: [element]
            };
        } else {
            treeItem.iconPath = vscode.Uri.file(path.join(
                this._context.extensionPath, 
                'icons', 
                'bullets',
                this._isDirectoryExpanded(element) ? 'folder-opened.svg' : 'folder-closed.svg'
            ));
        }
        
        treeItem.tooltip = element.path || element.label;
        return treeItem;
    }

    /**
     * Get children of the given element
     * @param {object} element
     * @returns {Promise<Array>}
     */
    async getChildren(element) {
        // If no element, return top-level items
        if (!element) {
            if (this._favorites.length === 0) {
                // Return a placeholder item if no favorites
                return [{
                    label: 'No favorites added yet',
                    path: null,
                    tooltip: 'Right-click on a markdown file and select "Add to Favorites"'
                }];
            }
            
            // Group favorites by directory
            const directoryMap = new Map();
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            
            for (const favorite of this._favorites) {
                try {
                    // Create file URI
                    const uri = vscode.Uri.file(favorite.path);
                    
                    // Check if file still exists
                    try {
                        await vscode.workspace.fs.stat(uri);
                    } catch (fileError) {
                        // Skip files that don't exist anymore
                        console.log(`Favorite file doesn't exist anymore: ${favorite.path}`);
                        continue;
                    }
                    
                    // Get directory path
                    const dirPath = path.dirname(favorite.path);
                    const fileName = path.basename(favorite.path);
                    
                    // Add to directory map
                    if (!directoryMap.has(dirPath)) {
                        directoryMap.set(dirPath, []);
                    }
                    
                    directoryMap.get(dirPath).push({
                        label: fileName,
                        path: favorite.path,
                        type: 'file',
                        uri: uri,
                        isMarkdownFile: true
                    });
                } catch (error) {
                    console.error(`Error processing favorite: ${favorite.path}`, error);
                }
            }
            
            // Convert directory map to tree items
            const result = [];
            
            // Add workspace root folders first
            for (const folder of workspaceFolders) {
                if (directoryMap.has(folder.uri.fsPath)) {
                    result.push({
                        label: folder.name,
                        path: folder.uri.fsPath,
                        type: 'directory',
                        uri: folder.uri,
                        children: directoryMap.get(folder.uri.fsPath)
                    });
                    directoryMap.delete(folder.uri.fsPath);
                }
            }
            
            // Add remaining directories
            for (const [dirPath, files] of directoryMap.entries()) {
                result.push({
                    label: path.basename(dirPath),
                    path: dirPath,
                    type: 'directory',
                    uri: vscode.Uri.file(dirPath),
                    children: files
                });
            }
            
            return result;
        }
        
        // For directory elements, return their children
        if (element.type === 'directory' && element.children) {
            return element.children;
        }
        
        // Files don't have children
        return [];
    }
}

module.exports = FavoritesTreeDataProvider;
