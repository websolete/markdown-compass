// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const ignore = require('ignore').default;

/**
 * Fuzzy search utility class for enhanced search capabilities
 */
class FuzzySearchUtils {
    /**
     * Calculate fuzzy match score between query and text
     * @param {string} query Search query
     * @param {string} text Text to search in
     * @returns {object|null} Match result with score and highlights, or null if no match
     */
    static fuzzyMatch(query, text) {
        if (!query || !text) return null;
        
        query = query.toLowerCase();
        text = text.toLowerCase();
        
        // Exact match gets highest score
        if (text.includes(query)) {
            const startIndex = text.indexOf(query);
            return {
                score: 100,
                highlights: [{
                    start: startIndex,
                    end: startIndex + query.length
                }]
            };
        }
        
        // Fuzzy matching algorithm
        let queryIndex = 0;
        let textIndex = 0;
        let score = 0;
        let highlights = [];
        let consecutiveMatches = 0;
        let lastMatchIndex = -1;
        
        while (queryIndex < query.length && textIndex < text.length) {
            if (query[queryIndex] === text[textIndex]) {
                if (lastMatchIndex === textIndex - 1) {
                    consecutiveMatches++;
                    score += 5 + consecutiveMatches; // Bonus for consecutive matches
                } else {
                    consecutiveMatches = 0;
                    score += 3;
                }
                
                highlights.push({ start: textIndex, end: textIndex + 1 });
                lastMatchIndex = textIndex;
                queryIndex++;
            }
            textIndex++;
        }
        
        // Must match all query characters
        if (queryIndex < query.length) {
            return null;
        }
        
        // Bonus for shorter text (more relevant)
        score += Math.max(0, 50 - text.length);
        
        // Bonus for matching at word boundaries
        const wordBoundaryMatches = this.countWordBoundaryMatches(query, text);
        score += wordBoundaryMatches * 10;
        
        return { score, highlights };
    }
    
    /**
     * Count matches that occur at word boundaries
     * @param {string} query Search query
     * @param {string} text Text to search in
     * @returns {number} Number of word boundary matches
     */
    static countWordBoundaryMatches(query, text) {
        let count = 0;
        const words = text.split(/[\s\-_\.]/);
        
        for (const word of words) {
            if (word.toLowerCase().startsWith(query.toLowerCase())) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Search multiple terms (space-separated) with AND logic
     * @param {string} query Multi-word search query
     * @param {string} text Text to search in
     * @returns {object|null} Combined match result or null
     */
    static multiTermSearch(query, text) {
        const terms = query.trim().split(/\s+/).filter(term => term.length > 0);
        if (terms.length === 0) return null;
        if (terms.length === 1) return this.fuzzyMatch(terms[0], text);
        
        let totalScore = 0;
        let allHighlights = [];
        
        // All terms must match
        for (const term of terms) {
            const match = this.fuzzyMatch(term, text);
            if (!match) return null;
            
            totalScore += match.score;
            allHighlights.push(...match.highlights);
        }
        
        // Average score across terms
        totalScore = totalScore / terms.length;
        
        // Merge overlapping highlights
        allHighlights.sort((a, b) => a.start - b.start);
        const mergedHighlights = [];
        let current = allHighlights[0];
        
        for (let i = 1; i < allHighlights.length; i++) {
            const next = allHighlights[i];
            if (current.end >= next.start) {
                current.end = Math.max(current.end, next.end);
            } else {
                mergedHighlights.push(current);
                current = next;
            }
        }
        if (current) mergedHighlights.push(current);
        
        return { score: totalScore, highlights: mergedHighlights };
    }
}

// Webview provider removed - focusing on sidebar navigation only

/**
 * Node representing either a Markdown file or a directory containing Markdown files
 */
class MarkdownNode {
    /**
     * @param {string} label Display name of the node
     * @param {vscode.Uri} uri Uri to the file or directory
     * @param {string} type Type of node ('file' or 'directory')
     */    constructor(label, uri, type) {
        this.label = label;
        this.uri = uri;
        this.type = type;
        this.isMarkdownFile = type === 'file' && label.toLowerCase().endsWith('.md');
        this.collapsibleState = type === 'directory' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
          // Enhanced file type detection
        this.fileType = this._detectFileType(label);
        this.lastModified = null;
        this.fileSize = null;
        this.readingTime = null;
        
        // First level header text for display enhancement
        this.firstLevelHeader = null;
        
        // Search-related properties
        this.searchScore = 0;
        this.searchHighlights = [];
        this.headerMatches = []; // For header content matches
        
        // Reading progress and status
        this.isModified = false;
        this.readingProgress = 0; // 0-100 percentage
        this.hasBeenRead = false;
    }
      /**
     * Detect the type of markdown file based on filename patterns
     * @param {string} filename The filename to analyze
     * @returns {string} The detected file type
     */
    _detectFileType(filename) {
        const lower = filename.toLowerCase();
        
        // Exact filename matches (highest priority)
        if (lower === 'readme.md') return 'readme-exact';
        if (lower === 'changelog.md') return 'changelog-exact';
        if (lower === 'history.md') return 'history-exact';
        if (lower === 'license.md') return 'license-exact';
        
        // Filename prefix matches (secondary priority)
        if (lower.startsWith('readme')) return 'readme';
        if (lower.startsWith('changelog')) return 'changelog';
        if (lower.startsWith('history')) return 'history';
        if (lower.startsWith('license')) return 'license';
        
        // Content-based matches
        if (lower.includes('analysis')) return 'analysis';
        if (lower.includes('doc') || lower.includes('guide') || lower.includes('manual')) return 'docs';
        if (lower.includes('tutorial') || lower.includes('howto') || lower.includes('getting-started')) return 'tutorial';
        if (lower.includes('api') || lower.includes('reference')) return 'api';
        if (lower.includes('spec') || lower.includes('requirement')) return 'spec';
        if (lower.includes('test') || lower.includes('example')) return 'test';
        if (lower.includes('note') || lower.includes('draft')) return 'notes';
        if (lower.includes('todo') || lower.includes('task')) return 'todo';
        
        return 'default';
    }/**
     * Get the appropriate icon for this file type
     * @returns {vscode.Uri} Icon path for VS Code
     */    getFileIcon() {
        const iconMap = {
            // Exact filename matches (darker shades)
            'readme-exact': 'readme-exact.svg',
            'changelog-exact': 'changelog-exact.svg',
            'history-exact': 'history-exact.svg',
            'license-exact': 'license-exact.svg',
            
            // Prefix matches (lighter shades of same color families)
            'readme': 'readme.svg',
            'changelog': 'changelog.svg',
            'history': 'history.svg',
            'license': 'license.svg',
            
            // Other file types
            'analysis': 'analysis.svg',
            'docs': 'docs.svg',
            'tutorial': 'tutorial.svg',
            'api': 'api.svg',
            'spec': 'spec.svg',
            'notes': 'notes.svg',
            'todo': 'todo.svg',
            'test': 'test.svg',
            'default': 'default.svg'
        };
        
        const iconFile = iconMap[this.fileType] || 'default.svg';
        return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', iconFile));
    }
      /**
     * Get enhanced tooltip with file information
     * @returns {string} Enhanced tooltip text
     */
    getEnhancedTooltip() {
        let tooltip = this.label;
        
        if (this.isMarkdownFile) {
            tooltip += `\nType: ${this.fileType.charAt(0).toUpperCase() + this.fileType.slice(1)} Document`;
            
            if (this.fileSize) {
                tooltip += `\nSize: ${this._formatFileSize(this.fileSize)}`;
            }
            
            if (this.readingTime) {
                tooltip += `\nEstimated reading time: ${this.readingTime} min`;
            }
            
            if (this.lastModified) {
                tooltip += `\nLast modified: ${this.lastModified.toLocaleDateString()}`;
            }
            
            // Add reading status information
            const statusDesc = this.getReadingStatusDescription();
            if (statusDesc !== 'Unread') {
                tooltip += `\nStatus: ${statusDesc}`;
            }
        }
        
        return tooltip;
    }
    
    /**
     * Format file size in human-readable format
     * @param {number} bytes File size in bytes
     * @returns {string} Formatted size
     */
    _formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
      /**
     * Set file metadata for enhanced display
     * @param {object} metadata File metadata object
     */
    setMetadata(metadata) {
        this.fileSize = metadata.size;
        this.lastModified = metadata.lastModified;
        this.readingTime = metadata.readingTime;
    }
    
    /**
     * Set reading progress and status
     * @param {number} progress Reading progress (0-100)
     * @param {boolean} hasBeenRead Whether file has been read
     * @param {boolean} isModified Whether file has been modified
     */
    setReadingStatus(progress = 0, hasBeenRead = false, isModified = false) {
        this.readingProgress = Math.max(0, Math.min(100, progress));
        this.hasBeenRead = hasBeenRead;
        this.isModified = isModified;
    }
    
    /**
     * Get reading status description
     * @returns {string} Status description for tooltip
     */
    getReadingStatusDescription() {
        if (this.hasBeenRead && this.readingProgress >= 100) {
            return 'Completed';
        } else if (this.readingProgress > 0) {
            return `${this.readingProgress}% read`;
        } else if (this.isModified) {
            return 'Modified recently';
        }
        return 'Unread';
    }    /**
     * Get appropriate status icon based on file state
     * @returns {object|null} Icon configuration or null for default
     */    getStatusIcon() {
        console.log(`DEBUG: getStatusIcon for ${this.label} - readingProgress: ${this.readingProgress}, hasBeenRead: ${this.hasBeenRead}, isModified: ${this.isModified}`);
        
        if (this.hasBeenRead && this.readingProgress >= 100) {
            console.log(`DEBUG: Using progress icon for ${this.label} (completed)`);
            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'progress.svg'));
        } else if (this.readingProgress > 0 && this.readingProgress < 100) {
            // Use a different icon for partially read files (using file-status as indicator)
            console.log(`DEBUG: Using file-status icon for ${this.label} (${this.readingProgress}% read)`);
            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'file-status.svg'));
        } else if (this.isModified) {
            console.log(`DEBUG: Using file-status icon for ${this.label} (modified)`);
            return vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'file-status.svg'));
        }
        
        console.log(`DEBUG: Using default icon for ${this.label}`);
        return null; // Use default file type icon
    }
      /**
     * Set search result data for this node
     * @param {number} score Search relevance score
     * @param {Array} highlights Array of highlight ranges
     * @param {Array} headerMatches Array of matching headers
     */
    setSearchData(score, highlights, headerMatches = []) {
        this.searchScore = score;
        this.searchHighlights = highlights;
        this.headerMatches = headerMatches;
    }
    
    /**
     * Set the first level header text for enhanced display
     * @param {string} headerText The first level header text
     */
    setFirstLevelHeader(headerText) {
        this.firstLevelHeader = headerText;
    }
    
    /**
     * Get display label with search highlighting (for future UI enhancement)
     * @returns {string} Label with potential highlighting markup
     */
    getDisplayLabel() {
        if (!this.searchHighlights || this.searchHighlights.length === 0) {
            return this.label;
        }
        
        // For now, return the original label
        // Future enhancement: could return with highlighting markup
        return this.label;
    }
}

/**
 * TreeDataProvider for the Markdown Navigator sidebar
 * Provides a hierarchical view of directories and Markdown files
 */
class MarkdownTreeDataProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Enable gitignore filtering by default
        this._useGitIgnore = true;
        // Cache for gitignore rules by workspace folder
        this._gitIgnoreCache = new Map();
        // Enhanced search functionality
        this._searchQuery = '';
        this._expandedPaths = new Map(); // Store expanded state during search
        this._searchResults = new Map(); // Cache search results by file path
        this._searchHistory = []; // Store recent searches
        this._maxSearchHistory = 10;
        // Header content cache for searching
        this._headerCache = new Map();
        // Track expanded directories for proper icon display
        this._expandedDirectories = new Set();
        // Auto-expansion state tracking
        this._isInitialLoad = true;
        this._autoExpandedPaths = new Set(); // Track which paths were auto-expanded
        this._firstMarkdownDepth = new Map(); // Cache depth of first markdown file per directory
        
        // Reading status persistence
        this._context = context;
        this._readingStatusStorage = context.globalState;
    }    /**
     * Save reading status for a file
     * @param {string} filePath File path
     * @param {object} status Reading status object
     */
    _saveReadingStatus(filePath, status) {
        const key = `readingStatus:${filePath}`;
        this._readingStatusStorage.update(key, status);
        console.log(`DEBUG: Saved reading status for ${filePath}:`, status);
    }

    /**
     * Load reading status for a file
     * @param {string} filePath File path
     * @returns {object|null} Reading status object or null
     */
    _loadReadingStatus(filePath) {
        const key = `readingStatus:${filePath}`;
        const status = this._readingStatusStorage.get(key);
        console.log(`DEBUG: Loaded reading status for ${filePath}:`, status);
        return status;
    }

    /**
     * Clear all saved reading status
     */
    _clearReadingStatus() {
        // Get all keys and remove reading status entries
        const keys = this._context.globalState.keys();
        keys.forEach(key => {
            if (key.startsWith('readingStatus:')) {
                this._readingStatusStorage.update(key, undefined);
            }
        });
    }

    /**
     * Refresh the tree view and clear caches
     */
    refresh() {
        console.log('DEBUG: TreeDataProvider.refresh() called');
        // Clear gitignore cache
        this._gitIgnoreCache.clear();
        // Clear header cache to prevent stale data
        this._headerCache.clear();
        // Clear search results cache
        this._searchResults.clear();
        // Reset auto-expansion state on manual refresh
        this._isInitialLoad = true;
        this._autoExpandedPaths.clear();
        this._firstMarkdownDepth.clear();
        // Fire event to refresh tree
        this._onDidChangeTreeData.fire();
    }
    
    /**
     * Set search query and refresh the tree
     * @param {string} query Search query
     */
    setSearchQuery(query) {
        // Add to search history if it's a new search
        if (query && query !== this._searchQuery) {
            this._addToSearchHistory(query);
        }
        
        // If search is being cleared, reset expanded paths and search results
        if (this._searchQuery && !query) {
            this._expandedPaths.clear();
            this._searchResults.clear();
        }
        
        this._searchQuery = query || '';
        this.refresh();
    }

    /**
     * Clear the search
     */
    clearSearch() {
        this._searchQuery = '';
        this._expandedPaths.clear();
        this._searchResults.clear();
        this.refresh();
    }

    /**
     * Add query to search history
     * @param {string} query Search query to add
     */
    _addToSearchHistory(query) {
        // Remove if already exists
        this._searchHistory = this._searchHistory.filter(q => q !== query);
        // Add to beginning
        this._searchHistory.unshift(query);
        // Limit size
        if (this._searchHistory.length > this._maxSearchHistory) {
            this._searchHistory = this._searchHistory.slice(0, this._maxSearchHistory);
        }
    }

    /**
     * Get search history for autocomplete/suggestions
     * @returns {Array<string>} Recent search queries
     */
    getSearchHistory() {
        return [...this._searchHistory];
    }
    
    /**
     * Enhanced search matching using fuzzy search
     * @param {MarkdownNode} item Tree item to check
     * @returns {Promise<boolean>} True if the item matches or there's no search query
     */
    async _matchesSearch(item) {
        // If no search query, everything matches
        if (!this._searchQuery) {
            return true;
        }

        // Check cache first
        const cacheKey = `${item.uri.fsPath}:${this._searchQuery}`;
        if (this._searchResults.has(cacheKey)) {
            const cachedResult = this._searchResults.get(cacheKey);
            item.setSearchData(cachedResult.score, cachedResult.highlights, cachedResult.headerMatches);
            return cachedResult.matches;
        }

        // Perform fuzzy search on file/directory name
        const nameMatch = FuzzySearchUtils.multiTermSearch(this._searchQuery, item.label);
        let totalScore = nameMatch ? nameMatch.score : 0;
        let allHighlights = nameMatch ? nameMatch.highlights : [];
        let headerMatches = [];

        // For markdown files, also search in headers
        if (item.isMarkdownFile && totalScore < 50) {
            const headerMatch = await this._searchInHeaders(item);
            if (headerMatch) {
                totalScore = Math.max(totalScore, headerMatch.score * 0.8); // Headers get slightly lower priority
                headerMatches = headerMatch.headers;
            }
        }

        const matches = totalScore > 0;
        
        // Cache the result
        this._searchResults.set(cacheKey, {
            matches,
            score: totalScore,
            highlights: allHighlights,
            headerMatches
        });

        // Set search data on the item
        item.setSearchData(totalScore, allHighlights, headerMatches);

        return matches;
    }    /**
     * Search within markdown file headers
     * @param {MarkdownNode} item Markdown file item
     * @returns {Promise<object|null>} Header search results
     */
    async _searchInHeaders(item) {
        try {
            // Check header cache first
            const filePath = item.uri.fsPath;
            if (!this._headerCache.has(filePath)) {
                // Read and parse headers
                const content = await vscode.workspace.fs.readFile(item.uri);
                const text = Buffer.from(content).toString('utf8');
                const headers = this._extractHeaders(text);
                this._headerCache.set(filePath, headers);
            }

            const headers = this._headerCache.get(filePath);
            const matchingHeaders = [];
            let bestScore = 0;

            for (const header of headers) {
                const match = FuzzySearchUtils.multiTermSearch(this._searchQuery, header.text);
                if (match) {
                    matchingHeaders.push({
                        ...header,
                        score: match.score,
                        highlights: match.highlights
                    });
                    bestScore = Math.max(bestScore, match.score);
                }
            }

            if (matchingHeaders.length > 0) {
                return {
                    score: bestScore,
                    headers: matchingHeaders
                };
            }
        } catch (error) {
            console.error(`Error searching headers in ${item.uri.fsPath}:`, error);
        }

        return null;
    }    /**
     * Extract headers from markdown content
     * @param {string} content Markdown file content
     * @returns {Array} Array of header objects
     */
    _extractHeaders(content) {
        const headers = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            
            if (headerMatch) {
                headers.push({
                    level: headerMatch[1].length,
                    text: headerMatch[2],
                    line: i + 1
                });
            }
        }
        
        return headers;
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
    
    /**
     * Check if a directory might contain files that match the search query
     * @param {vscode.Uri} dirUri Directory URI to check
     * @returns {Promise<boolean>} True if the directory might contain matching files
     */
    async _directoryMightContainMatches(dirUri) {
        if (!this._searchQuery) {
            return true;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            
            // Check all entries in this directory
            for (const [name, type] of entries) {
                // Use fuzzy search for file/directory name matching
                const match = FuzzySearchUtils.multiTermSearch(this._searchQuery, name);
                if (match) {
                    return true;
                }
                
                // For markdown files, also check header content
                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    const fileUri = vscode.Uri.joinPath(dirUri, name);
                    const fileNode = new MarkdownNode(name, fileUri, 'file');
                    if (await this._matchesSearch(fileNode)) {
                        return true;
                    }
                }
                
                // If this is a subdirectory, check it too (recursively)
                if (type === vscode.FileType.Directory) {
                    const subDirUri = vscode.Uri.joinPath(dirUri, name);
                    if (await this._directoryMightContainMatches(subDirUri)) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error(`Error checking directory for matches: ${error}`);
            return false;
        }
    }

    /**
     * Toggle gitignore filtering
     */
    toggleGitIgnoreFiltering() {
        this._useGitIgnore = !this._useGitIgnore;
        vscode.window.showInformationMessage(`GitIgnore filtering is now ${this._useGitIgnore ? 'enabled' : 'disabled'}`);
        this.refresh();
    }
    
    /**
     * Find the depth at which the first markdown file exists in a directory
     * @param {vscode.Uri} dirUri Directory URI to check
     * @param {number} currentDepth Current depth in the tree
     * @param {number} maxDepth Maximum depth to search
     * @returns {Promise<number|null>} Depth of first markdown file or null if none found
     */
    async _findFirstMarkdownDepth(dirUri, currentDepth = 0, maxDepth = 5) {
        // Check cache first
        const cacheKey = dirUri.toString();
        if (this._firstMarkdownDepth.has(cacheKey)) {
            return this._firstMarkdownDepth.get(cacheKey);
        }

        // Prevent infinite recursion
        if (currentDepth >= maxDepth) {
            this._firstMarkdownDepth.set(cacheKey, null);
            return null;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const workspaceFolder = this._getWorkspaceFolder(dirUri);
            const gitIgnoreRules = await this.getGitIgnoreRules(workspaceFolder ? workspaceFolder.uri : null);

            // First check if there are any markdown files at this level
            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    this._firstMarkdownDepth.set(cacheKey, currentDepth);
                    return currentDepth;
                }
            }

            // If no markdown files at this level, check subdirectories
            let minSubDepth = null;
            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.Directory) {
                    const subDepth = await this._findFirstMarkdownDepth(childUri, currentDepth + 1, maxDepth);
                    if (subDepth !== null) {
                        if (minSubDepth === null || subDepth < minSubDepth) {
                            minSubDepth = subDepth;
                        }
                    }
                }
            }

            this._firstMarkdownDepth.set(cacheKey, minSubDepth);
            return minSubDepth;
        } catch (error) {
            console.error(`Error finding first markdown depth in ${dirUri.fsPath}:`, error);
            this._firstMarkdownDepth.set(cacheKey, null);
            return null;
        }
    }

    /**
     * Find the path to the first markdown file in a directory
     * @param {vscode.Uri} dirUri Directory URI to check
     * @param {number} maxDepth Maximum depth to search
     * @returns {Promise<vscode.Uri[]|null>} Array of directory URIs leading to first markdown file
     */
    async _findPathToFirstMarkdown(dirUri, maxDepth = 5) {
        const cacheKey = `path:${dirUri.toString()}`;
        if (this._firstMarkdownDepth.has(cacheKey)) {
            return this._firstMarkdownDepth.get(cacheKey);
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const workspaceFolder = this._getWorkspaceFolder(dirUri);
            const gitIgnoreRules = await this.getGitIgnoreRules(workspaceFolder ? workspaceFolder.uri : null);

            // First check if there are any markdown files at this level
            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    // Found markdown file at this level, return empty path (already at target)
                    this._firstMarkdownDepth.set(cacheKey, []);
                    return [];
                }
            }

            // If no markdown files at this level, check subdirectories
            const sortedDirs = [];
            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.Directory) {
                    sortedDirs.push({ name, uri: childUri });
                }
            }

            // Sort directories alphabetically for consistent behavior
            sortedDirs.sort((a, b) => a.name.localeCompare(b.name));            // Check each subdirectory for markdown files
            for (const { uri: childUri } of sortedDirs) {
                if (maxDepth <= 0) break;

                const subPath = await this._findPathToFirstMarkdown(childUri, maxDepth - 1);
                if (subPath !== null) {
                    // Found a path in this subdirectory
                    const fullPath = [childUri, ...subPath];
                    this._firstMarkdownDepth.set(cacheKey, fullPath);
                    return fullPath;
                }
            }

            this._firstMarkdownDepth.set(cacheKey, null);
            return null;
        } catch (error) {
            console.error(`Error finding path to first markdown in ${dirUri.fsPath}:`, error);
            this._firstMarkdownDepth.set(cacheKey, null);
            return null;
        }
    }    /**
     * Determine if a directory should be auto-expanded during initial load
     * @param {vscode.Uri} dirUri Directory URI to check
     * @returns {Promise<boolean>} True if directory should be auto-expanded
     */
    async _shouldAutoExpand(dirUri) {
        // Only auto-expand during initial load
        if (!this._isInitialLoad) {
            return false;
        }

        // Don't auto-expand if we're in search mode
        if (this._searchQuery) {
            return false;
        }

        // Check if we've already determined this path should be auto-expanded
        const pathKey = dirUri.toString();
        if (this._autoExpandedPaths.has(pathKey)) {
            return true;
        }

        // For root workspace folders, always check for auto-expansion
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        const isWorkspaceRoot = workspaceFolders.some(folder => folder.uri.toString() === dirUri.toString());

        if (isWorkspaceRoot) {
            // Find the path to the first markdown file
            const pathToFirstMarkdown = await this._findPathToFirstMarkdown(dirUri);
            if (pathToFirstMarkdown && pathToFirstMarkdown.length > 0) {
                // Mark the first directory in the path for auto-expansion
                const firstDirInPath = pathToFirstMarkdown[0];
                this._autoExpandedPaths.add(firstDirInPath.toString());
                console.log(`Auto-expanding workspace root ${dirUri.fsPath} - path leads through ${firstDirInPath.fsPath}`);
                return true;
            }
        } else {
            // For non-root directories, check if this directory is in the path to first markdown
            const parentWorkspaceFolder = this._getWorkspaceFolder(dirUri);
            if (parentWorkspaceFolder) {
                const pathToFirstMarkdown = await this._findPathToFirstMarkdown(parentWorkspaceFolder.uri);
                if (pathToFirstMarkdown) {
                    // Check if current directory is in the path
                    const isInPath = pathToFirstMarkdown.some(pathUri => pathUri.toString() === dirUri.toString());
                    if (isInPath) {
                        this._autoExpandedPaths.add(pathKey);
                        console.log(`Auto-expanding ${dirUri.fsPath} - in path to first markdown`);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Get the TreeItem for the given element
     * @param {MarkdownNode} element
     * @returns {vscode.TreeItem}
     */    getTreeItem(element) {
        // Create the basic tree item structure
        let displayLabel = element.label;
        
        // For markdown files with first level headers, show header text above filename
        if (element.type === 'file' && element.isMarkdownFile && element.firstLevelHeader) {
            // Use the header text as the main label and filename as description
            displayLabel = element.firstLevelHeader;
        }
        
        const treeItem = new vscode.TreeItem(displayLabel, element.collapsibleState);
        // Enhanced label and tooltip for search results and file metadata
        let tooltip = element.isMarkdownFile ? element.getEnhancedTooltip() : element.label;
        
        // Add first level header to tooltip if present
        if (element.firstLevelHeader) {
            tooltip = `${element.firstLevelHeader}\nFile: ${element.label}\n\n${tooltip}`;
        }
        
        if (this._searchQuery && element.searchScore > 0) {
            // Enhanced tooltip with search information
            if (element.headerMatches && element.headerMatches.length > 0) {
                tooltip += `\n\nMatching headers:`;
                element.headerMatches.forEach(header => {
                    tooltip += `\n  ${'#'.repeat(header.level)} ${header.text} (line ${header.line})`;
                });
            }
            tooltip += `\nSearch relevance: ${Math.round(element.searchScore)}`;
        }
        
        treeItem.tooltip = tooltip;
          if (element.type === 'file' && element.isMarkdownFile) {
            // Now using our custom preview command that also updates the header view
            treeItem.command = {
                command: 'markdown-navigator.previewMarkdownFile',
                title: 'Preview Markdown File',
                arguments: [element]
            };
            treeItem.contextValue = 'markdownFile';              // Use status icon if available, otherwise use file type icon
            const statusIcon = element.getStatusIcon();
            const fileIcon = element.getFileIcon();
            
            console.log(`DEBUG: getTreeItem for ${element.label} - statusIcon: ${statusIcon ? 'YES' : 'NO'}, fileIcon: ${fileIcon ? 'YES' : 'NO'}`);
            
            treeItem.iconPath = statusIcon || fileIcon;
            treeItem.resourceUri = element.uri; // Add resourceUri for file icons
            
            // Enhanced descriptions for different states
            let description = '';
            
            // If we have a first level header, show the filename as description
            if (element.firstLevelHeader) {
                description = element.label;
            } else if (this._searchQuery && element.searchScore > 0) {
                // Search result information
                if (element.headerMatches?.length > 0) {
                    description = `${element.headerMatches.length} header${element.headerMatches.length > 1 ? 's' : ''}`;
                } else {
                    description = `Score: ${Math.round(element.searchScore)}`;
                }
                // Only use search highlight icon if there's no status icon (preserve read/unread indicators)
                if (element.searchScore > 75 && !statusIcon) {
                    treeItem.iconPath = vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 'search-highlight.svg'));
                }            } else if (element.readingTime && element.fileSize) {
                // Show reading time and status for normal display
                const statusDesc = element.getReadingStatusDescription();
                if (statusDesc !== 'Unread') {
                    description = `${element.readingTime}min • ${statusDesc}`;
                } else {
                    description = `${element.readingTime}min read`;
                }
            } else if (element.getReadingStatusDescription() !== 'Unread') {
                // Show status even without reading time metadata
                description = element.getReadingStatusDescription();
            }
            
            treeItem.description = description;
        } else if (element.type === 'file') {
            // Non-markdown file - should not happen with our filter
            treeItem.iconPath = new vscode.ThemeIcon('file');
            treeItem.resourceUri = element.uri;
            treeItem.contextValue = 'file';
        } else {
            // Directory - use different icons based on collapsible state
            // Use a dynamic approach that checks both element state and any override conditions
            const isExpanded = this._isDirectoryExpanded(element);
            treeItem.iconPath = vscode.Uri.file(path.join(__dirname, 'icons', 'bullets', 
                isExpanded ? 'folder-opened.svg' : 'folder-closed.svg'));
            treeItem.resourceUri = element.uri;
            treeItem.contextValue = 'directory';
        }
        
        return treeItem;
    }

    /**
     * Check if a directory is currently expanded in the tree view
     * @param {MarkdownNode} element Directory element to check
     * @returns {boolean} True if directory is expanded
     */
    _isDirectoryExpanded(element) {
        if (!element || element.type !== 'directory') {
            return false;
        }
        
        // Check if this directory is in our expanded set
        const dirKey = element.uri.toString();
        return this._expandedDirectories.has(dirKey);
    }

    /**
     * Handle tree item expansion event
     * @param {MarkdownNode} element The expanded element
     */
    _onTreeItemExpanded(element) {
        if (element && element.type === 'directory') {
            const dirKey = element.uri.toString();
            this._expandedDirectories.add(dirKey);
            console.log(`Directory expanded: ${element.label}`);
            
            // Refresh the tree item to update the icon
            this._onDidChangeTreeData.fire(element);
        }
    }

    /**
     * Handle tree item collapse event
     * @param {MarkdownNode} element The collapsed element
     */
    _onTreeItemCollapsed(element) {
        if (element && element.type === 'directory') {
            const dirKey = element.uri.toString();
            this._expandedDirectories.delete(dirKey);
            console.log(`Directory collapsed: ${element.label}`);
            
            // Refresh the tree item to update the icon
            this._onDidChangeTreeData.fire(element);
        }
    }

    /**
     * Load .gitignore rules for a workspace folder
     * @param {vscode.Uri} workspaceFolderUri 
     * @returns {Promise<any|null>}
     */
    async getGitIgnoreRules(workspaceFolderUri) {
        // If not using gitignore filtering, return null
        if (!this._useGitIgnore) {
            return null;
        }

        // Check cache first
        if (this._gitIgnoreCache.has(workspaceFolderUri.fsPath)) {
            return this._gitIgnoreCache.get(workspaceFolderUri.fsPath);
        }

        // Create a new ignore instance
        const ig = ignore();
        
        try {
            // Find all .gitignore files in the workspace
            const gitIgnorePath = vscode.Uri.joinPath(workspaceFolderUri, '.gitignore');
            
            try {
                // Check if .gitignore exists
                await vscode.workspace.fs.stat(gitIgnorePath);
                
                // Read the .gitignore file
                const content = await vscode.workspace.fs.readFile(gitIgnorePath);
                const gitIgnoreContent = Buffer.from(content).toString('utf8');
                
                // Add rules to the ignore instance
                ig.add(gitIgnoreContent);
                console.log(`Loaded .gitignore from ${gitIgnorePath.fsPath}`);
            } catch (error) {
                // .gitignore file doesn't exist or couldn't be read
                console.log(`No .gitignore found at ${gitIgnorePath.fsPath} or error reading it: ${error.message}`);
            }
            
            // Cache the rules
            this._gitIgnoreCache.set(workspaceFolderUri.fsPath, ig);
            return ig;
        } catch (error) {
            console.error(`Error loading .gitignore rules: ${error}`);
            return null;
        }
    }
    
    /**
     * Set the parent of a tree item
     * @param {MarkdownNode} element 
     * @returns {Promise<MarkdownNode|null>}
     */
    async getParent(element) {
        if (!element || !element.uri) {
            return null;
        }

        try {
            const elementPath = element.uri.fsPath;
            
            // If this is a workspace folder (root level), it has no parent
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    if (folder.uri.fsPath === elementPath) {
                        return null; // This is a root workspace folder
                    }
                }
            }
            
            // Get the parent directory
            const parentUri = vscode.Uri.file(path.dirname(elementPath));
            
            // Check if parent is a workspace folder
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    if (folder.uri.fsPath === parentUri.fsPath) {
                        return new MarkdownNode(folder.name, folder.uri, 'directory');
                    }
                }
            }
            
            // Create parent directory node
            const parentName = path.basename(parentUri.fsPath);
            return new MarkdownNode(parentName, parentUri, 'directory');
            
        } catch (error) {
            console.error('Error getting parent for tree item:', error);
            return null;
        }
    }

    /**
     * Find and reveal a tree item by URI
     * @param {vscode.Uri} targetUri
     * @param {vscode.TreeView} treeView
     * @returns {Promise<boolean>}
     */
    async findAndRevealTreeItem(targetUri, treeView) {
        if (!targetUri || !treeView) {
            console.warn('findAndRevealTreeItem: Missing parameters', {
                hasTargetUri: !!targetUri,
                hasTreeView: !!treeView
            });
            return false;
        }

        try {
            const targetPath = targetUri.fsPath;
            console.log(`=== TREE SELECTION DEBUG ===`);
            console.log(`Target file: ${targetPath}`);
            console.log(`Tree view title: ${treeView.title || 'unknown'}`);
            console.log(`Tree view visible: ${treeView.visible}`);
            
            // Ensure the tree view is ready
            if (!treeView.visible) {
                console.warn('Tree view is not visible - attempting to make it visible');
                try {
                    await vscode.commands.executeCommand('markdownNavigator.focus');
                } catch (focusError) {
                    console.log('Could not focus tree view:', focusError.message);
                }
            }
            
            // Find the item by searching through the tree
            const findItem = async (items, depth = 0, parentPath = '') => {
                if (!items || items.length === 0) {
                    console.log(`  Depth ${depth}: No items to search in ${parentPath || 'root'}`);
                    return null;
                }
                
                console.log(`  Depth ${depth}: Searching ${items.length} items in ${parentPath || 'root'}`);
                
                for (const item of items) {
                    const itemPath = item.uri ? item.uri.fsPath : 'no-uri';
                    console.log(`  Depth ${depth}: Checking "${item.label}" (${item.type}) - ${itemPath}`);
                    
                    if (item.uri && item.uri.fsPath === targetPath) {
                        console.log(`  ✓ FOUND matching tree item: ${item.label} at depth ${depth}`);
                        return item;
                    }
                    
                    // If target path starts with this directory path, search its children
                    if (item.type === 'directory' && targetPath.startsWith(itemPath + path.sep)) {
                        console.log(`  Depth ${depth}: Target may be in directory "${item.label}" - expanding...`);
                        try {
                            const children = await this.getChildren(item);
                            if (children && children.length > 0) {
                                const found = await findItem(children, depth + 1, itemPath);
                                if (found) return found;
                            } else {
                                console.log(`  Depth ${depth}: Directory "${item.label}" has no children`);
                            }
                        } catch (childError) {
                            console.error(`  Error getting children for ${item.label}:`, childError);
                        }
                    }
                }
                return null;
            };
            
            // Start search from root
            console.log('Starting search from root level...');
            const rootItems = await this.getChildren(undefined);
            console.log(`Root items: ${rootItems ? rootItems.length : 0}`);
            
            if (rootItems && rootItems.length > 0) {
                for (const rootItem of rootItems) {
                    console.log(`Root item: "${rootItem.label}" - ${rootItem.uri?.fsPath}`);
                }
            }
            
            const foundItem = await findItem(rootItems);
            
            if (foundItem) {
                console.log(`Attempting to reveal tree item: "${foundItem.label}"`);
                try {
                    // First try to expand parent directories if needed
                    const parent = await this.getParent(foundItem);
                    if (parent) {
                        console.log(`Expanding parent directory: ${parent.label}`);
                        try {
                            await treeView.reveal(parent, { expand: true });
                        } catch (parentRevealError) {
                            console.log('Could not expand parent:', parentRevealError.message);
                        }
                    }
                    
                    // Now reveal and select the target item
                    await treeView.reveal(foundItem, { 
                        select: true, 
                        focus: false, 
                        expand: 1 
                    });
                    console.log(`✓ Successfully revealed tree item: ${foundItem.label}`);
                    
                    // Verify selection after a brief delay
                    setTimeout(() => {
                        const selection = treeView.selection;
                        if (selection && selection.length > 0) {
                            const selectedItem = selection[0];
                            console.log(`✓ Tree selection confirmed: ${selectedItem.label}`);
                        } else {
                            console.warn('⚠ Tree selection not confirmed - no items in selection');
                        }
                    }, 150);
                    
                    return true;
                } catch (revealError) {
                    console.error('✗ Error during tree reveal:', revealError);
                    return false;
                }
            } else {
                console.log(`✗ Tree item not found for: ${targetPath}`);
                
                // Debug: List all items we found to help troubleshoot
                console.log('=== DEBUG: All items in tree ===');
                const debugListItems = async (items, depth = 0) => {
                    if (!items) return;
                    for (const item of items) {
                        console.log(`${'  '.repeat(depth)}${item.label} (${item.type}) - ${item.uri?.fsPath}`);
                        if (item.type === 'directory') {
                            try {
                                const children = await this.getChildren(item);
                                if (children && children.length > 0) {
                                    await debugListItems(children, depth + 1);
                                }
                            } catch (e) {
                                console.log(`${'  '.repeat(depth + 1)}Error getting children: ${e.message}`);
                            }
                        }
                    }
                };
                await debugListItems(rootItems);
                console.log('=== END DEBUG ===');
                
                return false;
            }
        } catch (error) {
            console.error('✗ Error finding and revealing tree item:', error);
            return false;
        }
    }

    /**
     * Get the children of the given element (required by TreeDataProvider interface)
     * @param {MarkdownNode} element The parent element to get children for (undefined for root)
     * @returns {Promise<MarkdownNode[]>} Array of child elements
     */
    async getChildren(element) {
        // If element is undefined, return workspace root folders
        if (!element) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return [];
            }

            const rootItems = [];
            for (const folder of workspaceFolders) {
                // Check if this workspace folder contains markdown files
                if (await this._containsMarkdownFiles(folder.uri)) {
                    const folderNode = new MarkdownNode(folder.name, folder.uri, 'directory');
                    
                    // Set collapsible state based on whether it should auto-expand
                    const shouldAutoExpand = await this._shouldAutoExpand(folder.uri);
                    folderNode.collapsibleState = shouldAutoExpand 
                        ? vscode.TreeItemCollapsibleState.Expanded 
                        : vscode.TreeItemCollapsibleState.Collapsed;
                    
                    rootItems.push(folderNode);
                }
            }
            
            // After first load, disable auto-expansion
            this._isInitialLoad = false;
            return rootItems;
        }

        // For directory elements, return their contents
        if (element.type === 'directory') {
            return await this._getDirectoryContents(element.uri);
        }

        // Files don't have children
        return [];
    }

    /**
     * Get contents of a directory, filtered to only include markdown files and directories containing them
     * @param {vscode.Uri} dirUri Directory URI to read
     * @returns {Promise<MarkdownNode[]>} Array of child nodes
     */
    async _getDirectoryContents(dirUri) {
        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const items = [];
            const workspaceFolder = this._getWorkspaceFolder(dirUri);
            const gitIgnoreRules = await this.getGitIgnoreRules(workspaceFolder ? workspaceFolder.uri : null);

            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    // This is a markdown file
                    const fileNode = new MarkdownNode(name, childUri, 'file');
                    
                    // Extract first level header and set metadata for enhanced display
                    try {
                        const content = await vscode.workspace.fs.readFile(childUri);
                        const text = Buffer.from(content).toString('utf8');
                        const firstHeader = this._extractFirstLevelHeader(text);
                        if (firstHeader) {
                            fileNode.setFirstLevelHeader(firstHeader);
                        }
                        
                        // Calculate and set file metadata
                        const stats = await vscode.workspace.fs.stat(childUri);
                        const wordCount = text.split(/\s+/).length;
                        const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // Average 200 words per minute
                          fileNode.setMetadata({
                            size: stats.size,
                            lastModified: new Date(stats.mtime),
                            readingTime: readingTime
                        });
                        
                        // Restore reading status from storage
                        const savedStatus = this._loadReadingStatus(childUri.fsPath);
                        if (savedStatus) {
                            fileNode.setReadingStatus(savedStatus.progress, savedStatus.hasBeenRead, savedStatus.isModified);
                        }
                    } catch (error) {
                        // If we can't read the file, just continue without the header and metadata
                        console.warn(`Could not read file ${childUri.fsPath} for header extraction:`, error);
                    }
                    
                    // Apply search filtering
                    if (await this._matchesSearch(fileNode)) {
                        items.push(fileNode);
                    }
                } else if (type === vscode.FileType.Directory) {
                    // Check if directory contains markdown files or matches search
                    const containsMarkdown = await this._containsMarkdownFiles(childUri);
                    const mightContainMatches = await this._directoryMightContainMatches(childUri);
                    
                    if (containsMarkdown && mightContainMatches) {
                        const dirNode = new MarkdownNode(name, childUri, 'directory');
                        
                        // Set collapsible state based on auto-expansion rules
                        const shouldAutoExpand = await this._shouldAutoExpand(childUri);
                        dirNode.collapsibleState = shouldAutoExpand 
                            ? vscode.TreeItemCollapsibleState.Expanded 
                            : vscode.TreeItemCollapsibleState.Collapsed;
                        
                        items.push(dirNode);
                    }
                }
            }

            // Sort items: directories first, then files, both alphabetically
            items.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.label.localeCompare(b.label);
            });

            return items;
        } catch (error) {
            console.error(`Error reading directory ${dirUri.fsPath}:`, error);
            return [];
        }
    }

    /**
     * Check if a directory contains markdown files (recursively)
     * @param {vscode.Uri} dirUri Directory URI to check
     * @returns {Promise<boolean>} True if directory contains markdown files
     */
    async _containsMarkdownFiles(dirUri) {
        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const workspaceFolder = this._getWorkspaceFolder(dirUri);
            const gitIgnoreRules = await this.getGitIgnoreRules(workspaceFolder ? workspaceFolder.uri : null);

            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    return true;
                } else if (type === vscode.FileType.Directory) {
                    // Recursively check subdirectories
                    if (await this._containsMarkdownFiles(childUri)) {
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error(`Error checking if directory contains markdown files: ${error}`);
            return false;
        }
    }

    /**
     * Get workspace folder for a given URI
     * @param {vscode.Uri} uri File or directory URI
     * @returns {vscode.WorkspaceFolder|null} The workspace folder containing the URI
     */
    _getWorkspaceFolder(uri) {
        return vscode.workspace.getWorkspaceFolder(uri);
    }

    /**
     * Get comprehensive workspace statistics
     * @returns {Promise<object>} Statistics about markdown files in the workspace
     */
    async getWorkspaceStatistics() {
        const stats = {
            totalFiles: 0,
            totalReadingTime: 0,
            fileTypes: {},
            readStatus: {
                read: 0,
                partial: 0,
                unread: 0
            },
            averageFileSize: 0,
            totalSize: 0,
            largestFile: null,
            smallestFile: null
        };

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return stats;
            }

            for (const folder of workspaceFolders) {
                await this._collectStatistics(folder.uri, stats);
            }

            // Calculate averages
            if (stats.totalFiles > 0) {
                stats.averageFileSize = Math.round(stats.totalSize / stats.totalFiles);
            }

            return stats;
        } catch (error) {
            console.error('Error getting workspace statistics:', error);
            return stats;
        }
    }

    /**
     * Recursively collect statistics from a directory
     * @param {vscode.Uri} dirUri Directory to analyze
     * @param {object} stats Statistics object to update
     */
    async _collectStatistics(dirUri, stats) {
        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const workspaceFolder = this._getWorkspaceFolder(dirUri);
            const gitIgnoreRules = await this.getGitIgnoreRules(workspaceFolder ? workspaceFolder.uri : null);

            for (const [name, type] of entries) {
                const childUri = vscode.Uri.joinPath(dirUri, name);
                const relativePath = vscode.workspace.asRelativePath(childUri);

                // Apply .gitignore filtering
                if (gitIgnoreRules && gitIgnoreRules.ignores(relativePath)) {
                    continue;
                }

                if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
                    const fileNode = new MarkdownNode(name, childUri, 'file');
                    
                    // Count file
                    stats.totalFiles++;
                    
                    // Add to file types
                    const ext = path.extname(name).toLowerCase();
                    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
                    
                    // Get file size
                    try {
                        const fileStat = await vscode.workspace.fs.stat(childUri);
                        const fileSize = fileStat.size;
                        stats.totalSize += fileSize;
                        
                        // Track largest and smallest files
                        if (!stats.largestFile || fileSize > stats.largestFile.size) {
                            stats.largestFile = { name, size: fileSize };
                        }
                        if (!stats.smallestFile || fileSize < stats.smallestFile.size) {
                            stats.smallestFile = { name, size: fileSize };
                        }
                    } catch (sizeError) {
                        console.warn(`Could not get size for ${name}:`, sizeError);
                    }
                    
                    // Calculate reading time and status
                    if (fileNode.readingTime) {
                        stats.totalReadingTime += fileNode.readingTime;
                    }
                    
                    const readingStatus = fileNode.getReadingStatusDescription();
                    if (readingStatus === 'Read') {
                        stats.readStatus.read++;
                    } else if (readingStatus === 'Partially Read') {
                        stats.readStatus.partial++;
                    } else {
                        stats.readStatus.unread++;
                    }
                } else if (type === vscode.FileType.Directory) {
                    // Recursively process subdirectories
                    await this._collectStatistics(childUri, stats);
                }
            }        } catch (error) {
            console.warn(`Error collecting statistics from ${dirUri.fsPath}:`, error);
        }
    }
}

/**
 * Header view provider for displaying markdown file headers
 */
class MarkdownHeaderViewProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._headers = [];
        this._currentFile = null;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Update headers for a specific markdown file
     * @param {vscode.Uri} fileUri URI of the markdown file
     */
    async updateHeaders(fileUri) {
        try {
            this._currentFile = fileUri;
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = Buffer.from(content).toString('utf8');
            this._headers = this._extractHeaders(text);
            this.refresh();
        } catch (error) {
            console.error('Error updating headers:', error);
            this._headers = [];
            this.refresh();
        }
    }

    /**
     * Clear headers but keep the view visible with placeholder
     */
    clearHeaders() {
        this._currentFile = null;
        this._headers = [];
        this.refresh();
    }

    /**
     * Extract headers from markdown content
     * @param {string} content Markdown file content
     * @returns {Array} Array of header objects
     */
    _extractHeaders(content) {
        const headers = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            
            if (headerMatch) {
                headers.push({
                    level: headerMatch[1].length,
                    text: headerMatch[2],
                    line: i + 1,
                    id: `header-${i}-${headerMatch[1].length}`
                });
            }
        }
        
        return headers;
    }

    getTreeItem(element) {
        // Handle placeholder item when no document is selected
        if (element.isPlaceholder) {
            const treeItem = new vscode.TreeItem(element.text, vscode.TreeItemCollapsibleState.None);
            treeItem.description = '';
            treeItem.tooltip = 'Click on a markdown file to view its headers';
            treeItem.iconPath = new vscode.ThemeIcon('info');
            // No command for placeholder - it's just informational
            return treeItem;
        }

        const hasChildren = element.children && element.children.length > 0;
        const collapsibleState = hasChildren ? 
            vscode.TreeItemCollapsibleState.Expanded : 
            vscode.TreeItemCollapsibleState.None;
            
        const treeItem = new vscode.TreeItem(element.text, collapsibleState);
        // Removed line number from description - cleaner display
        treeItem.description = '';
        treeItem.tooltip = `${element.text} (Line ${element.line})`;
        
        // Set icon based on header level with hierarchical icons
        const iconMap = {
            1: 'book',           // H1 - Book
            2: 'bookmark',       // H2 - Bookmark  
            3: 'list-ordered',   // H3 - List
            4: 'note',           // H4 - Note
            5: 'pencil',         // H5 - Pencil
            6: 'dash'            // H6 - Dash
        };
        
        treeItem.iconPath = new vscode.ThemeIcon(iconMap[element.level] || 'symbol-field');
        
        // Command to navigate to header
        treeItem.command = {
            command: 'markdown-navigator.goToHeader',
            title: 'Go to Header',
            arguments: [element.line]
        };
        
        return treeItem;
    }

    getChildren(element) {
        if (!element) {
            // If no current file, show placeholder
            if (!this._currentFile) {
                return [{
                    text: 'Select a document for viewing',
                    isPlaceholder: true
                }];
            }
            
            // Return top-level headers (hierarchically structured)
            const hierarchy = this._buildHierarchy();
            
            // If no headers found, show informational message
            if (hierarchy.length === 0) {
                return [{
                    text: 'No headers found in document',
                    isPlaceholder: true
                }];
            }
            
            return hierarchy;
        }
        // Return children of this header
        return element.children || [];
    }

    /**
     * Build hierarchical structure from flat header list
     * @returns {Array} Hierarchically structured headers
     */
    _buildHierarchy() {
        if (!this._headers || this._headers.length === 0) {
            return [];
        }

        const result = [];
        const stack = []; // Stack to track parent headers at each level

        for (const header of this._headers) {
            // Create header object with children array
            const headerNode = {
                ...header,
                children: []
            };

            // Pop from stack until we find a valid parent (lower level number)
            while (stack.length > 0 && stack[stack.length - 1].level >= header.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                // This is a top-level header
                result.push(headerNode);
            } else {
                // This is a child of the header on top of the stack
                stack[stack.length - 1].children.push(headerNode);
            }

            // Push current header to stack
            stack.push(headerNode);
        }

        return result;
    }
}

/**
 * Called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Markdown Navigator extension is being activated');

    // Create the tree data provider with context for persistence
    const treeDataProvider = new MarkdownTreeDataProvider(context);
    const headerProvider = new MarkdownHeaderViewProvider();

    // Register the tree view
    const treeView = vscode.window.createTreeView('markdownNavigator', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });

    // Register the header view
    const headerView = vscode.window.createTreeView('markdownHeaders', {
        treeDataProvider: headerProvider
    });    // Track tree view events for proper icon updates
    context.subscriptions.push(
        treeView.onDidExpandElement(e => {
            treeDataProvider._onTreeItemExpanded(e.element);
        }),
        treeView.onDidCollapseElement(e => {
            treeDataProvider._onTreeItemCollapsed(e.element);
        })
    );

    // Function to update the context for showing/hiding the header view
    const updateMarkdownContext = (editor) => {
        const isMarkdownFile = editor && editor.document && editor.document.languageId === 'markdown';
        
        // ALWAYS keep the Current Document view visible
        vscode.commands.executeCommand('setContext', 'markdownNavigatorActiveDocument', true);
        
        if (isMarkdownFile) {
            // Update header view with the active markdown file
            headerProvider.updateHeaders(editor.document.uri);
            console.log(`Markdown context set: ${editor.document.uri.fsPath}`);
        } else {
            // Clear headers but keep the view visible with placeholder
            headerProvider.clearHeaders();
            console.log('Markdown context cleared - showing placeholder');
        }
    };

    // Listen for active editor changes to update context
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateMarkdownContext),
        // Also listen for when tabs are closed to update context
        vscode.workspace.onDidCloseTextDocument((document) => {
            if (document.languageId === 'markdown') {
                // Check if there are any other markdown files still open
                const hasOpenMarkdown = vscode.window.visibleTextEditors.some(
                    editor => editor.document.languageId === 'markdown'
                );
                if (!hasOpenMarkdown) {
                    // Don't hide the view, just clear headers and show placeholder
                    headerProvider.clearHeaders();
                    console.log('Last markdown file closed - showing placeholder');
                }
            }
        })
    );

    // Set initial context - ALWAYS show the Current Document view
    vscode.commands.executeCommand('setContext', 'markdownNavigatorActiveDocument', true);
    updateMarkdownContext(vscode.window.activeTextEditor);

    // Initialize search context
    vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', false);

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('markdown-navigator.refresh', () => {
        treeDataProvider.refresh();
    });

    const searchCommand = vscode.commands.registerCommand('markdownNavigator.search', async () => {
        const query = await vscode.window.showInputBox({
            placeHolder: 'Search markdown files...',
            prompt: 'Enter search terms (use spaces to search multiple terms)',
            value: treeDataProvider._searchQuery
        });
        
        if (query !== undefined) {
            treeDataProvider.setSearchQuery(query);
        }
    });

    const clearSearchCommand = vscode.commands.registerCommand('markdownNavigator.clearSearch', () => {
        treeDataProvider.clearSearch();
    });

    const toggleGitIgnoreCommand = vscode.commands.registerCommand('markdownNavigator.toggleGitIgnore', () => {
        treeDataProvider.toggleGitIgnoreFiltering();
    });    const previewCommand = vscode.commands.registerCommand('markdown-navigator.previewMarkdownFile', async (node) => {
        if (node && node.uri) {
            try {
                // Open the markdown file in preview mode
                await vscode.commands.executeCommand('markdown.showPreview', node.uri);
                
                // Set context for header view visibility
                await vscode.commands.executeCommand('setContext', 'markdownNavigatorActiveDocument', true);
                
                // Update header view with the file's headers
                await headerProvider.updateHeaders(node.uri);
                
                // Try to reveal the item in the tree view
                await treeDataProvider.findAndRevealTreeItem(node.uri, treeView);
                
                console.log(`Previewed markdown file: ${node.uri.fsPath}`);
            } catch (error) {
                console.error('Error previewing markdown file:', error);
                vscode.window.showErrorMessage(`Could not preview file: ${error.message}`);
            }
        }
    });    const goToHeaderCommand = vscode.commands.registerCommand('markdown-navigator.goToHeader', async (lineNumber) => {
        try {
            if (!headerProvider._currentFile || !lineNumber) {
                console.warn('No current file or line number for header navigation');
                return;
            }
            
            console.log(`Navigating to header at line ${lineNumber} in PREVIEW`);
            
            // Find the actual header from our parsed headers list instead of parsing the line
            const targetHeader = headerProvider._headers.find(header => header.line === lineNumber);
            
            if (!targetHeader) {
                console.warn(`No header found in parsed headers for line ${lineNumber}`);
                // Fallback: try to open preview and show approximate location
                await vscode.commands.executeCommand('markdown.showPreview', headerProvider._currentFile);
                vscode.window.showWarningMessage(`Could not find header at line ${lineNumber}. Preview opened to document.`);
                return;
            }
            
            const headerText = targetHeader.text;
            console.log(`Found header: "${headerText}" at line ${lineNumber}`);
            
            // Method 1: Try VS Code's fragment navigation with multiple anchor formats
            const anchorFormats = [
                generateVSCodeHeaderAnchor(headerText),
                generateGitHubStyleAnchor(headerText),
                generateSimpleAnchor(headerText)
            ];
            
            for (const anchor of anchorFormats) {
                if (!anchor) continue;
                
                try {
                    console.log(`Trying anchor format: "${anchor}"`);
                    const baseUri = headerProvider._currentFile.toString();
                    const fragmentUri = `${baseUri}#${anchor}`;
                    
                    // Use showPreview with the fragment
                    await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.parse(fragmentUri));
                    
                    // Give it a moment to load and scroll
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    console.log(`✓ Successfully navigated to header using anchor: ${anchor}`);
                    // Removed the success message - navigation is silent when successful
                    return;
                } catch (fragmentError) {
                    console.log(`Anchor "${anchor}" failed:`, fragmentError.message);
                }
            }
            
            // Method 2: Use editor-based navigation with immediate return to preview
            try {
                console.log('Trying editor-based navigation...');
                
                // Step 1: Open in editor to set cursor position
                const document = await vscode.workspace.openTextDocument(headerProvider._currentFile);
                const position = new vscode.Position(lineNumber - 1, 0);
                
                const editor = await vscode.window.showTextDocument(document, {
                    selection: new vscode.Range(position, position),
                    preview: true,
                    preserveFocus: true,
                    viewColumn: vscode.ViewColumn.One
                });
                
                // Step 2: Ensure the line is visible in the editor
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                
                // Step 3: Wait a moment for positioning
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Step 4: Try to sync the selection to preview
                try {
                    await vscode.commands.executeCommand('markdown.showSelectionInPreview');
                    console.log('Selection synced to preview');
                } catch (syncError) {
                    console.log('Could not sync to preview, opening fresh preview');
                    // Step 5: Open preview in side panel if sync fails
                    await vscode.commands.executeCommand('markdown.showPreviewToSide', headerProvider._currentFile);
                }
                
                console.log(`✓ Navigated to header using editor method: ${headerText}`);
                // Removed the success message - navigation is silent when successful
                return;
                
            } catch (editorError) {
                console.warn('Editor-based navigation failed:', editorError.message);
            }
            
            // Method 3: Preview with search suggestion
            try {
                console.log('Using preview with search suggestion...');
                
                // Open the preview
                await vscode.commands.executeCommand('markdown.showPreview', headerProvider._currentFile);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Copy header text to clipboard for easy searching
                await vscode.env.clipboard.writeText(headerText);
                
                // Show helpful message
                const action = await vscode.window.showInformationMessage(
                    `Opened preview. Header "${headerText}" has been copied to clipboard. Use Ctrl+F to find it.`,
                    'Search Now'
                );
                
                if (action === 'Search Now') {
                    // Open find in preview
                    await vscode.commands.executeCommand('editor.action.webvieweditor.showFind');
                }
                
                return;
                
            } catch (previewError) {
                console.warn('Preview with search failed:', previewError.message);
            }
            
            // Method 4: Last resort - calculate approximate position
            try {
                console.log('Using approximate position calculation...');
                
                await vscode.commands.executeCommand('markdown.showPreview', headerProvider._currentFile);
                
                // Read file to calculate position
                const content = await vscode.workspace.fs.readFile(headerProvider._currentFile);
                const text = Buffer.from(content).toString('utf8');
                const lines = text.split('\n');
                const totalLines = lines.length;
                const scrollPercentage = Math.min(100, Math.max(0, ((lineNumber - 1) / totalLines) * 100));
                
                vscode.window.showInformationMessage(
                    `Preview opened. Header "${headerText}" is approximately ${Math.round(scrollPercentage)}% down the document.`
                );
                
            } catch (fallbackError) {
                console.error('All navigation methods failed:', fallbackError);
                vscode.window.showErrorMessage('Could not navigate to header in preview');
            }
            
        } catch (error) {
            console.error('Critical error in header navigation:', error);
            vscode.window.showErrorMessage(`Header navigation error: ${error.message}`);
        }
    });

    // Add the missing openInEditorCommand
    const openInEditorCommand = vscode.commands.registerCommand('markdown-navigator.openInEditor', async (node) => {
        if (node && node.uri) {
            try {
                await vscode.window.showTextDocument(node.uri);
                console.log(`Opened in editor: ${node.uri.fsPath}`);
            } catch (error) {
                console.error('Error opening file in editor:', error);
                vscode.window.showErrorMessage(`Could not open file in editor: ${error.message}`);
            }
        }
    });

    // Add the missing openFile command for compatibility
    const openFileCommand = vscode.commands.registerCommand('markdown-navigator.openFile', async (node) => {
        if (node && node.uri) {
            try {
                // For markdown files, always use preview mode
                if (node.isMarkdownFile) {
                    await vscode.commands.executeCommand('markdown-navigator.previewMarkdownFile', node);
                } else {
                    // For non-markdown files, open in editor
                    await vscode.window.showTextDocument(node.uri);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Could not open file: ${error.message}`);
            }
        }
    });

    const copyPathCommand = vscode.commands.registerCommand('markdown-navigator.copyPath', async (node) => {
        if (node && node.uri) {
            await vscode.env.clipboard.writeText(node.uri.fsPath);
            vscode.window.showInformationMessage('Path copied to clipboard');
        }
    });

    const copyHeaderLinkCommand = vscode.commands.registerCommand('markdown-navigator.copyHeaderLink', async (header) => {
        if (header && headerProvider._currentFile) {
            try {
                // Generate markdown link to header
                const fileName = path.basename(headerProvider._currentFile.fsPath);
                const headerAnchor = header.text.toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
                    .replace(/\s+/g, '-')     // Replace spaces with hyphens
                    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
                    .replace(/^-|-$/g, '');   // Remove leading/trailing hyphens
                
                const markdownLink = `[${header.text}](${fileName}#${headerAnchor})`;
                await vscode.env.clipboard.writeText(markdownLink);
                vscode.window.showInformationMessage(`Header link copied: ${header.text}`);
                console.log(`Copied header link: ${markdownLink}`);
            } catch (error) {
                console.error('Error copying header link:', error);
                vscode.window.showErrorMessage(`Could not copy header link: ${error.message}`);
            }
        }
    });

    // Override the header provider's getTreeItem to ensure proper command setup
    const originalHeaderGetTreeItem = headerProvider.getTreeItem;
    headerProvider.getTreeItem = function(element) {
        const treeItem = originalHeaderGetTreeItem.call(this, element);
        treeItem.contextValue = 'markdownHeader';
        
        // CRITICAL: ONLY use preview navigation - never open source view
        treeItem.command = {
            command: 'markdown-navigator.goToHeader',
            title: 'Go to Header in Preview',
            arguments: [element.line]
        };
        
        // Ensure no other commands or behaviors can interfere
        treeItem.resourceUri = undefined; // Prevent any file opening behavior
        
        return treeItem;
    };

    const searchInSidebarCommand = vscode.commands.registerCommand('markdown-navigator.searchInSidebar', async () => {
        const query = await vscode.window.showInputBox({
            placeHolder: 'Filter files in sidebar...',
            prompt: 'Enter search terms to filter the file list',
            value: treeDataProvider._searchQuery
        });
        
        if (query !== undefined) {
            treeDataProvider.setSearchQuery(query);
            // Set context for clear search button visibility
            vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', !!query);
        }
    });

    const clearSearchSidebarCommand = vscode.commands.registerCommand('markdown-navigator.clearSearch', () => {
        treeDataProvider.clearSearch();
        vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', false);
    });

    const searchMarkdownFilesCommand = vscode.commands.registerCommand('markdown-navigator.searchMarkdownFiles', async () => {
        // Open VS Code's built-in search with .md filter
        try {
            await vscode.commands.executeCommand('workbench.action.findInFiles', {
                query: '',
                filesToInclude: '**/*.md',
                triggerSearch: false,
                focusResults: true
            });
            console.log('Opened search pane filtered for markdown files');
        } catch (error) {
            console.error('Error opening search pane:', error);
            vscode.window.showErrorMessage('Could not open search pane');
        }
    });

    const refreshHeadersCommand = vscode.commands.registerCommand('markdown-navigator.refreshHeaders', () => {
        if (headerProvider._currentFile) {
            headerProvider.updateHeaders(headerProvider._currentFile);
            vscode.window.showInformationMessage('Headers refreshed');
        } else {
            vscode.window.showWarningMessage('No markdown file is currently active');
        }
    });    const markAsReadCommand = vscode.commands.registerCommand('markdown-navigator.markAsRead', async (node) => {
        if (node && node.isMarkdownFile) {
            console.log(`DEBUG: markAsRead command called for ${node.label}`);
            node.setReadingStatus(100, true, false);
            console.log(`DEBUG: After setReadingStatus - readingProgress: ${node.readingProgress}, hasBeenRead: ${node.hasBeenRead}`);
            
            // Save reading status to persistent storage
            treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                progress: node.readingProgress,
                hasBeenRead: node.hasBeenRead,
                isModified: node.isModified
            });
            
            treeDataProvider.refresh();
            vscode.window.showInformationMessage(`Marked "${node.label}" as read`);
        }
    });    const markAsUnreadCommand = vscode.commands.registerCommand('markdown-navigator.markAsUnread', async (node) => {
        if (node && node.isMarkdownFile) {
            node.setReadingStatus(0, false, false);
            
            // Save reading status to persistent storage
            treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                progress: node.readingProgress,
                hasBeenRead: node.hasBeenRead,
                isModified: node.isModified
            });
            
            treeDataProvider.refresh();
            vscode.window.showInformationMessage(`Marked "${node.label}" as unread`);
        }
    });    // Add a command for testing partial reading progress
    const markAsPartialCommand = vscode.commands.registerCommand('markdown-navigator.markAsPartial', async (node) => {
        if (node && node.isMarkdownFile) {
            console.log(`DEBUG: markAsPartial command called for ${node.label}`);
            // Set to 50% read for testing
            node.setReadingStatus(50, false, false);
            console.log(`DEBUG: After setReadingStatus - readingProgress: ${node.readingProgress}, hasBeenRead: ${node.hasBeenRead}`);
            
            // Save reading status to persistent storage
            treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                progress: node.readingProgress,
                hasBeenRead: node.hasBeenRead,
                isModified: node.isModified
            });
            
            treeDataProvider.refresh();
            vscode.window.showInformationMessage(`Marked "${node.label}" as 50% read`);
        }
    });

    const showStatsCommand = vscode.commands.registerCommand('markdown-navigator.showWorkspaceStats', async () => {
        try {
            const stats = await treeDataProvider.getWorkspaceStatistics();
            
            let message = `📊 Markdown Files Statistics\n\n`;
            message += `📄 Total Files: ${stats.totalFiles}\n`;
            message += `⏱️ Total Reading Time: ${Math.round(stats.totalReadingTime)} minutes\n`;
            message += `📊 Average File Size: ${stats.averageFileSize ? (stats.averageFileSize / 1024).toFixed(1) + ' KB' : 'N/A'}\n`;
            message += `📈 Total Size: ${(stats.totalSize / 1024).toFixed(1)} KB\n\n`;
            
            if (stats.readStatus.read > 0 || stats.readStatus.partial > 0 || stats.readStatus.unread > 0) {
                message += `📖 Reading Status:\n`;
                message += `✅ Read: ${stats.readStatus.read}\n`;
                message += `📖 Partially Read: ${stats.readStatus.partial}\n`;
                message += `⭕ Unread: ${stats.readStatus.unread}\n\n`;
            }
            
            if (Object.keys(stats.fileTypes).length > 0) {
                message += `📁 File Types:\n`;
                Object.entries(stats.fileTypes).forEach(([ext, count]) => {
                    message += `${ext}: ${count}\n`;
                });
            }
            
            if (stats.largestFile) {
                message += `\n📏 Largest: ${stats.largestFile.name} (${(stats.largestFile.size / 1024).toFixed(1)} KB)`;
            }
            if (stats.smallestFile) {
                message += `\n📏 Smallest: ${stats.smallestFile.name} (${(stats.smallestFile.size / 1024).toFixed(1)} KB)`;
            }
            
            vscode.window.showInformationMessage(message, { modal: true });
        } catch (error) {
            console.error('Error getting workspace statistics:', error);
            vscode.window.showErrorMessage(`Error getting statistics: ${error.message}`);
        }
    });

    // Add subscriptions to context
    context.subscriptions.push(
        treeView,
        headerView,
        refreshCommand,
        searchCommand,
        clearSearchCommand,
        toggleGitIgnoreCommand,
        previewCommand,
        goToHeaderCommand,
        openInEditorCommand,
        openFileCommand,
        copyPathCommand,
        copyHeaderLinkCommand,
        searchInSidebarCommand,
        clearSearchSidebarCommand,
        searchMarkdownFilesCommand,
        refreshHeadersCommand,
        markAsReadCommand,
        markAsUnreadCommand,
        markAsPartialCommand,
        showStatsCommand
    );

    console.log('Markdown Navigator extension activated successfully');
}

/**
 * Called when the extension is deactivated
 */
function deactivate() {
    console.log('Markdown Navigator extension deactivated');
}

module.exports = {
    activate,
    deactivate
};

/**
 * Generate VS Code-compatible header anchor using their exact algorithm
 * @param {string} headerText The header text to convert to anchor
 * @returns {string} The generated anchor
 */
function generateVSCodeHeaderAnchor(headerText) {
    // VS Code's algorithm for generating header anchors
    return headerText
        .toLowerCase()
        .trim()
        // Remove markdown formatting
        .replace(/[`*_~\[\]()]/g, '')
        // Replace non-word characters except spaces and hyphens
        .replace(/[^\w\s-\u00A0-\uFFFF]/g, '')
        // Replace whitespace with hyphens
        .replace(/\s+/g, '-')
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Ensure it's not empty
        || 'header';
}

/**
 * Generate GitHub-style header anchor
 * @param {string} headerText The header text
 * @returns {string} GitHub-style anchor
 */
function generateGitHubStyleAnchor(headerText) {
    return headerText
        .toLowerCase()
        .trim()
        // Remove punctuation except hyphens and spaces
        .replace(/[^\w\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Generate simple alphanumeric anchor
 * @param {string} headerText The header text
 * @returns {string} Simple anchor
 */
function generateSimpleAnchor(headerText) {
    return headerText
        .toLowerCase()
        .trim()
        // Keep only alphanumeric and spaces
        .replace(/[^a-z0-9\s]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove multiple hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Generate alternative anchor formats to try as fallbacks
 * @param {string} headerText The header text
 * @returns {Array<string>} Array of alternative anchor formats
 */
function generateAlternativeAnchors(headerText) {
    const alternatives = [];
    
    // GitHub-style anchor
    const githubAnchor = generateGitHubStyleAnchor(headerText);
    if (githubAnchor) alternatives.push(githubAnchor);
    
    // Simple anchor (just alphanumeric and hyphens)
    const simpleAnchor = generateSimpleAnchor(headerText);
    if (simpleAnchor) alternatives.push(simpleAnchor);
    
    // URL-encoded anchor
    try {
        const encodedAnchor = encodeURIComponent(
            headerText.toLowerCase().replace(/\s+/g, '-')
        );
        if (encodedAnchor) alternatives.push(encodedAnchor);
    } catch (e) {
        // Ignore encoding errors
    }
    
    // Raw text anchor (some parsers use this)
    const rawAnchor = headerText.toLowerCase().replace(/\s+/g, '');
    if (rawAnchor) alternatives.push(rawAnchor);
    
    return alternatives;
}
