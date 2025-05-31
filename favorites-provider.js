/**
 * Favorites functionality for Markdown Navigator
 */
const vscode = require('vscode');
const path = require('path');

/**
 * Tree data provider for markdown favorites
 */
class FavoritesTreeDataProvider {
    /**
     * Constructor
     * @param {vscode.ExtensionContext} context Extension context for state persistence
     * @param {MarkdownTreeDataProvider} markdownProvider Reference to main markdown provider
     */
    constructor(context, markdownProvider) {
        this._context = context;
        this._markdownProvider = markdownProvider;
        this._favorites = this._context.globalState.get('markdownNavigator.favorites', []);
        
        // Event emitter for tree changes
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        
        // Set context variable to show/hide view based on whether we have favorites
        this._updateContext();
    }
    
    /**
     * Refresh the tree view
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Get tree item representation of a favorite item
     * @param {Object} element Tree item
     * @returns {vscode.TreeItem} VS Code tree item
     */
    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(
            element.label,
            vscode.TreeItemCollapsibleState.None
        );
        
        // Copy as many properties as possible from the original tree item
        treeItem.tooltip = element.tooltip || element.label;
        treeItem.description = element.description || '';
        
        // Add command to preview the file when clicked
        treeItem.command = {
            command: 'markdown-navigator.previewMarkdownFile',
            title: 'Preview Markdown File',
            arguments: [element]
        };
        
        // Set the appropriate icon
        if (element.iconPath) {
            treeItem.iconPath = element.iconPath;
        } else {
            // Default icon
            treeItem.iconPath = vscode.Uri.file(
                path.join(__dirname, 'icons', 'bullets', 'default.svg')
            );
        }
        
        // Set the context value for the context menu
        treeItem.contextValue = 'markdownFile';
        
        return treeItem;
    }
    
    /**
     * Get children of the given element
     * @param {Object} element Tree item parent (unused as favorites are flat list)
     * @returns {Promise<Array>} Array of child items
     */
    async getChildren(element) {
        // We don't have hierarchy - favorites are flat list
        if (element) {
            return [];
        }
        
        if (!this._favorites || this._favorites.length === 0) {
            return [];
        }
        
        // Load each favorite with current metadata
        const items = [];
        for (const favorite of this._favorites) {
            try {
                const uri = vscode.Uri.parse(favorite.uri);
                
                // Create the node
                const node = {
                    label: favorite.label || path.basename(uri.fsPath),
                    uri: uri,
                    type: 'file',
                    isMarkdownFile: true,
                    collapsibleState: vscode.TreeItemCollapsibleState.None
                };
                
                // Try to load metadata from the original file
                // This allows showing reading status, etc.
                await this._loadMetadata(node);
                
                items.push(node);
            } catch (error) {
                console.error(`Error loading favorite: ${error}`);
                // Skip invalid favorites
            }
        }
        
        return items;
    }
    
    /**
     * Load metadata for a favorite (header, reading time, etc.)
     * @param {Object} node Favorite node
     */
    async _loadMetadata(node) {
        try {
            // Try to extract first level header
            const content = await vscode.workspace.fs.readFile(node.uri);
            const text = Buffer.from(content).toString('utf8');
            
            // Extract first level header if available
            const headerMatch = text.match(/^#\s+(.+)$/m);
            if (headerMatch) {
                node.firstLevelHeader = headerMatch[1];
            }
            
            // Calculate reading time
            const wordCount = text.split(/\\s+/).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));
            const stats = await vscode.workspace.fs.stat(node.uri);
            
            node.setMetadata = function(metadata) {
                Object.assign(this, metadata);
            };
            
            node.setMetadata({
                size: stats.size,
                lastModified: new Date(stats.mtime),
                readingTime: readingTime
            });
            
            // Load reading status from the main provider if available
            if (this._markdownProvider && this._markdownProvider._loadReadingStatus) {
                const status = this._markdownProvider._loadReadingStatus(node.uri.fsPath);
                if (status) {
                    node.readingStatus = status;
                    
                    // Add methods needed for status indicators
                    node.getReadingStatusDescription = function() {
                        if (!this.readingStatus) return 'Unread';
                        
                        if (this.readingStatus.hasBeenRead) {
                            return 'Read';
                        } else if (this.readingStatus.progress > 0) {
                            return 'Partially Read';
                        } else {
                            return 'Unread';
                        }
                    };
                    
                    node.getStatusIcon = function() {
                        if (!this.readingStatus) return null;
                        
                        const status = this.getReadingStatusDescription();
                        if (status === 'Read') {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'progress.svg'));
                        } else if (status === 'Partially Read') {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'progress.svg'));
                        }
                        return null;
                    };
                    
                    node.getFileIcon = function() {
                        // Basic file icon based on name
                        const fileName = path.basename(this.uri.fsPath).toLowerCase();
                        
                        if (fileName === 'readme.md') {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'readme.svg'));
                        } else if (fileName === 'changelog.md') {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'changelog.svg'));
                        } else if (/^todo.*/i.test(fileName)) {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'todo.svg'));
                        } else if (/^notes.*/i.test(fileName)) {
                            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'notes.svg'));
                        }
                        
                        return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'default.svg'));
                    };
                    
                    node.getEnhancedTooltip = function() {
                        let tooltip = '';
                        
                        if (this.readingTime) {
                            tooltip += `Reading time: ~${this.readingTime} min\n`;
                        }
                        
                        if (this.fileSize) {
                            tooltip += `Size: ${this._formatFileSize(this.fileSize)}\n`;
                        }
                        
                        if (this.lastModified) {
                            tooltip += `Last modified: ${this.lastModified.toLocaleDateString()}\n`;
                        }
                        
                        tooltip += `Status: ${this.getReadingStatusDescription()}`;
                        
                        return tooltip;
                    };
                }
            }
        } catch (error) {
            console.error(`Error loading metadata for favorite ${node.uri.fsPath}: ${error}`);
        }
    }
    
    /**
     * Add a file to favorites
     * @param {Object} node Tree item to add to favorites
     */
    async addToFavorites(node) {
        if (!node || !node.uri) {
            return;
        }
        
        // Check if already in favorites
        const alreadyExists = this._favorites.some(
            f => f.uri === node.uri.toString()
        );
        
        if (alreadyExists) {
            vscode.window.showInformationMessage(`${node.label} is already in favorites`);
            return;
        }
        
        // Add to favorites
        this._favorites.push({
            uri: node.uri.toString(),
            label: path.basename(node.uri.fsPath),
            dateAdded: new Date().toISOString()
        });
        
        // Save to global state
        await this._context.globalState.update('markdownNavigator.favorites', this._favorites);
        
        // Update context and refresh view
        this._updateContext();
        this.refresh();
        
        vscode.window.showInformationMessage(`Added ${node.label} to favorites`);
    }
    
    /**
     * Remove an item from favorites
     * @param {Object} node Tree item to remove from favorites
     */
    async removeFromFavorites(node) {
        if (!node || !node.uri) {
            return;
        }
        
        const initialCount = this._favorites.length;
        
        // Remove from favorites
        this._favorites = this._favorites.filter(
            f => f.uri !== node.uri.toString()
        );
        
        if (initialCount === this._favorites.length) {
            vscode.window.showInformationMessage(`${node.label} is not in favorites`);
            return;
        }
        
        // Save to global state
        await this._context.globalState.update('markdownNavigator.favorites', this._favorites);
        
        // Update context and refresh view
        this._updateContext();
        this.refresh();
        
        vscode.window.showInformationMessage(`Removed ${node.label} from favorites`);
    }
    
    /**
     * Update context to show/hide favorites view
     */
    _updateContext() {
        const hasFavorites = this._favorites && this._favorites.length > 0;
        vscode.commands.executeCommand(
            'setContext', 
            'markdownNavigator.hasFavorites', 
            hasFavorites
        );
    }
      /**
     * Handle tree item expansion event
     * @param {Object} element The expanded element
     */
    _onTreeItemExpanded(element) {
        // Favorites view is a flat list, but we need this method for compatibility
        console.log(`Favorites item expanded: ${element?.label || 'unknown'}`);
    }

    /**
     * Handle tree item collapse event
     * @param {Object} element The collapsed element
     */
    _onTreeItemCollapsed(element) {
        // Favorites view is a flat list, but we need this method for compatibility
        console.log(`Favorites item collapsed: ${element?.label || 'unknown'}`);
    }
}

module.exports = FavoritesTreeDataProvider;
