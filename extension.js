// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const ignore = require('ignore');
const FavoritesTreeDataProvider = require('./favorites-provider');
const EnhancedPreviewProvider = require('./enhanced-preview-provider');

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
        let displayLabel

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

        treeItem.tooltip = tooltip;        if (element.type === 'file' && element.isMarkdownFile) {
            // Using enhanced preview as the default left-click behavior
            treeItem.command = {
                command: 'markdown-navigator.openEnhancedPreview',
                title: 'Open Enhanced Preview',
                arguments: [element]
            };
            treeItem.contextValue = 'markdownFile';// Use status icon if available, otherwise use file type icon
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
                }
            } else if (element.readingTime && element.fileSize) {
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
            return this._gitIgnoreCache.get(workspaceFolderUri.fsPath);        }

        // Create a new ignore instance
        const ig = ignore.default();

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
                } if (type === vscode.FileType.File && name.toLowerCase().endsWith('.md')) {
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
            }
        } catch (error) {
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
        };        treeItem.iconPath = new vscode.ThemeIcon(iconMap[element.level] || 'symbol-field');

        // Command to navigate to header with enhanced preview
        treeItem.command = {
            command: 'markdown-navigator.openEnhancedPreviewAtHeader',
            title: 'Open Enhanced Preview at Header',
            arguments: [this._currentFile, element.line]
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

    // Track the last previewed markdown file
    let lastPreviewedMarkdownFile = null;

    // Create the tree data provider with context for persistence
    const treeDataProvider = new MarkdownTreeDataProvider(context);
    const headerProvider = new MarkdownHeaderViewProvider();
    const favoritesProvider = new FavoritesTreeDataProvider(context, treeDataProvider);

    // Register the tree view
    const treeView = vscode.window.createTreeView('markdownNavigator', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });    // Register the header view
    vscode.window.createTreeView('markdownHeaders', {
        treeDataProvider: headerProvider
    });    // Register the favorites view
    vscode.window.createTreeView('markdownFavorites', {
        treeDataProvider: favoritesProvider
    });

    // Track tree view events for proper icon updates    context.subscriptions.push(
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
            // Update the tracking variable since we have an active markdown editor
            lastPreviewedMarkdownFile = editor.document.uri;
            console.log(`Markdown context set: ${editor.document.uri.fsPath}`);
        } else {
            // Check if we have a previewed markdown file before clearing headers
            if (lastPreviewedMarkdownFile) {
                // Keep showing headers for the last previewed file
                console.log(`Keeping headers for previewed file: ${lastPreviewedMarkdownFile.fsPath}`);
                // Don't clear headers if we have a preview active
                return;
            } else {
                // Clear headers but keep the view visible with placeholder
                headerProvider.clearHeaders();
                console.log('Markdown context cleared - showing placeholder');
            }
        }
    };

    // Listen for active editor changes to update context
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateMarkdownContext),
        vscode.workspace.onDidCloseTextDocument((document) => {
            if (document.languageId === 'markdown') {
                // Check if the closed document was our tracked preview file
                if (lastPreviewedMarkdownFile && lastPreviewedMarkdownFile.toString() === document.uri.toString()) {
                    lastPreviewedMarkdownFile = null;
                    console.log('Tracked preview file was closed - clearing tracking');
                }

                // Check if there are any other markdown files still open
                const hasOpenMarkdown = vscode.window.visibleTextEditors.some(
                    editor => editor.document.languageId === 'markdown'
                );
                if (!hasOpenMarkdown && !lastPreviewedMarkdownFile) {
                    // Don't hide the view, just clear headers and show placeholder
                    headerProvider.clearHeaders();
                    console.log('Last markdown file closed - showing placeholder');
                }
            }
        })
    );

    // Set initial context - ALWAYS show the Current Document view
    vscode.commands.executeCommand('setContext', 'markdownNavigatorActiveDocument', true);
    updateMarkdownContext(vscode.window.activeTextEditor);    // Initialize search context
    vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', false);    // Register Enhanced Preview Provider v2
    EnhancedPreviewProvider.register(context);

    // Register commands - THIS SECTION IS CRITICAL
    // Make sure every command registered here matches what's defined in package.json
    context.subscriptions.push(
        // Refresh command - Fix the command ID to match package.json
        vscode.commands.registerCommand('markdown-navigator.refresh', () => {
            treeDataProvider.refresh();
        }),

        // Add to favorites
        vscode.commands.registerCommand('markdown-navigator.addToFavorites', async (node) => {
            if (node && node.uri) {
                await favoritesProvider.addToFavorites(node);
            }
        }),

        // Remove from favorites
        vscode.commands.registerCommand('markdown-navigator.removeFromFavorites', async (node) => {
            if (node && node.uri) {
                await favoritesProvider.removeFromFavorites(node);
            }
        }),

        // Search command - Fix the command ID to match package.json
        vscode.commands.registerCommand('markdown-navigator.searchMarkdownFiles', async () => {
            const query = await vscode.window.showInputBox({
                placeHolder: 'Search markdown files...',
                prompt: 'Enter search terms (use spaces to search multiple terms)',
                value: treeDataProvider._searchQuery
            });

            if (query !== undefined) {
                treeDataProvider.setSearchQuery(query);
                vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', !!query);
            }
        }),

        // Search in sidebar command
        vscode.commands.registerCommand('markdown-navigator.searchInSidebar', async () => {
            const query = await vscode.window.showInputBox({
                placeHolder: 'Filter files in sidebar...',
                prompt: 'Enter terms to filter files in sidebar',
                value: treeDataProvider._searchQuery
            });

            if (query !== undefined) {
                treeDataProvider.setSearchQuery(query);
                vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', !!query);
            }
        }),

        // Clear search command - Single registration only
        vscode.commands.registerCommand('markdown-navigator.clearSearch', () => {
            treeDataProvider.clearSearch();
            vscode.commands.executeCommand('setContext', 'markdown-navigator:isSearchActive', false);
        }),

        // Toggle gitignore
        vscode.commands.registerCommand('markdownNavigator.toggleGitIgnore', () => {
            treeDataProvider.toggleGitIgnoreFiltering();
        }),

        // Preview markdown file
        vscode.commands.registerCommand('markdown-navigator.previewMarkdownFile', async (node) => {
            if (node && node.uri) {
                try {
                    // Open the markdown file in preview mode
                    await vscode.commands.executeCommand('markdown.showPreview', node.uri);

                    // Track the last previewed markdown file
                    lastPreviewedMarkdownFile = node.uri;

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
        }),

        // Go to header
        vscode.commands.registerCommand('markdown-navigator.goToHeader', async (lineNumber) => {
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
                    // Track the preview since we just opened it
                    lastPreviewedMarkdownFile = headerProvider._currentFile;
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

                        // Track the preview since we just opened it
                        lastPreviewedMarkdownFile = headerProvider._currentFile;

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
                    } catch (error) {
                        console.log('Could not sync to preview, opening fresh preview:', error.message);
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
                    // Track the preview since we just opened it
                    lastPreviewedMarkdownFile = headerProvider._currentFile;
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
                    // Track the preview since we just opened it
                    lastPreviewedMarkdownFile = headerProvider._currentFile;

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
        }),

        // Refresh headers command
        vscode.commands.registerCommand('markdown-navigator.refreshHeaders', () => {
            headerProvider.refresh();
        }),

        // Copy header link command
        vscode.commands.registerCommand('markdown-navigator.copyHeaderLink', async (element) => {
            if (element && element.text && element.line) {
                const headerAnchor = generateVSCodeHeaderAnchor(element.text);
                const link = `#${headerAnchor}`;
                await vscode.env.clipboard.writeText(link);
                vscode.window.showInformationMessage(`Header link copied: ${link}`);
            }
        }),

        // Mark as read command
        vscode.commands.registerCommand('markdown-navigator.markAsRead', async (node) => {
            if (node && node.uri) {
                node.setReadingStatus(100, true, false);
                treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                    progress: 100,
                    hasBeenRead: true,
                    isModified: false
                });
                treeDataProvider._onDidChangeTreeData.fire(node);
            }
        }),

        // Mark as unread command
        vscode.commands.registerCommand('markdown-navigator.markAsUnread', async (node) => {
            if (node && node.uri) {
                node.setReadingStatus(0, false, false);
                treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                    progress: 0,
                    hasBeenRead: false,
                    isModified: false
                });
                treeDataProvider._onDidChangeTreeData.fire(node);
            }
        }),

        // Mark as partial command
        vscode.commands.registerCommand('markdown-navigator.markAsPartial', async (node) => {
            if (node && node.uri) {
                node.setReadingStatus(50, false, false);
                treeDataProvider._saveReadingStatus(node.uri.fsPath, {
                    progress: 50,
                    hasBeenRead: false,
                    isModified: false
                });
                treeDataProvider._onDidChangeTreeData.fire(node);
            }
        }),

        // Show workspace stats command
        vscode.commands.registerCommand('markdown-navigator.showWorkspaceStats', async () => {
            const stats = await treeDataProvider.getWorkspaceStatistics();

            const message = `Markdown Workspace Statistics:
            
Total Files: ${stats.totalFiles}
Total Reading Time: ${stats.totalReadingTime} minutes
Average File Size: ${stats.averageFileSize} bytes

Reading Status:
- Read: ${stats.readStatus.read}
- Partial: ${stats.readStatus.partial}
- Unread: ${stats.readStatus.unread}

${stats.largestFile ? `Largest File: ${stats.largestFile.name} (${stats.largestFile.size} bytes)` : ''}
${stats.smallestFile ? `Smallest File: ${stats.smallestFile.name} (${stats.smallestFile.size} bytes)` : ''}`;

            vscode.window.showInformationMessage(message);
        }),

        // Open file command
        vscode.commands.registerCommand('markdown-navigator.openFile', async (node) => {
            if (node && node.uri) {
                await vscode.window.showTextDocument(node.uri);
            }
        }),

        // Open in editor command
        vscode.commands.registerCommand('markdown-navigator.openInEditor', async (node) => {
            if (node && node.uri) {
                await vscode.window.showTextDocument(node.uri, { preview: false });
            }
        }),

        // Copy path command
        vscode.commands.registerCommand('markdown-navigator.copyPath', async (node) => {
            if (node && node.uri) {
                await vscode.env.clipboard.writeText(node.uri.fsPath);
                vscode.window.showInformationMessage('Path copied to clipboard');
            }
        }),

        // Select preview theme command
        vscode.commands.registerCommand('markdown-navigator.selectPreviewTheme', async () => {
            try {
                const config = vscode.workspace.getConfiguration('markdownNavigator');
                const currentTheme = config.get('previewTheme', 'default');
                const themeOptions = [
                    { label: 'Academic', description: 'Academic paper style with serif fonts', value: 'academic' },
                    { label: 'Dark Elegant', description: 'Elegant dark theme with refined typography', value: 'dark-elegant' },
                    { label: 'Dark Enhanced', description: 'Enhanced dark mode with better contrast', value: 'dark-enhanced' },
                    { label: 'Dark Technical', description: 'Technical documentation dark theme', value: 'dark-technical' },
                    { label: 'Dark Vibrant', description: 'Vibrant dark theme with colorful accents', value: 'dark-vibrant' },
                    { label: 'Default', description: 'VS Code default markdown preview styling', value: 'default' },
                    { label: 'GitHub', description: 'GitHub-style markdown with clean typography', value: 'github' },
                    { label: 'Light Modern', description: 'Modern light theme with clean layout', value: 'light-modern' },
                    { label: 'Light Sepia', description: 'Sepia-toned theme for comfortable reading', value: 'light-sepia' },
                    { label: 'Light Technical', description: 'Technical documentation light theme', value: 'light-technical' },
                    { label: 'Minimal', description: 'Minimal style with focus on content', value: 'minimal' }
                ];

                // Set quickPick with current theme preselected
                const quickPick = vscode.window.createQuickPick();
                quickPick.items = themeOptions;
                quickPick.placeholder = 'Select a theme for markdown preview';
                quickPick.activeItems = themeOptions.filter(item => item.value === currentTheme);                quickPick.onDidChangeSelection(async selection => {
                    if (selection[0]) {
                        // Get the selected theme value from our theme options array
                        const selectedItem = selection[0];
                        const selectedTheme = themeOptions.find(option => option.label === selectedItem.label)?.value || 'default';
                        quickPick.dispose();

                        if (selectedTheme !== currentTheme) {
                            // Update theme setting
                            await config.update('previewTheme', selectedTheme, vscode.ConfigurationTarget.Global);
                            console.log(`[Markdown Navigator] Theme changed from ${currentTheme} to ${selectedTheme}`);

                            // Apply the theme - pass context to applyMarkdownTheme
                            const success = await applyMarkdownTheme(context, selectedTheme);
                            if (success) {
                                vscode.window.showInformationMessage(`Applied theme: ${selectedItem.label}`);
                            } else {
                                vscode.window.showErrorMessage(`Failed to apply theme: ${selectedItem.label}`);
                            }
                        } else {
                            console.log(`[Markdown Navigator] Theme selection unchanged: ${currentTheme}`);
                        }
                    }
                });

                quickPick.onDidHide(() => quickPick.dispose());
                quickPick.show();

            } catch (error) {
                console.error('Error selecting preview theme:', error);
                vscode.window.showErrorMessage(`Error selecting theme: ${error.message}`);
            }
        }),

        // Reset markdown styles command (for debugging)
        vscode.commands.registerCommand('markdown-navigator.resetStyles', async () => {
            try {
                // Completely reset markdown styles to empty array
                await vscode.workspace.getConfiguration('markdown').update('styles', [], vscode.ConfigurationTarget.Workspace);
                await vscode.workspace.getConfiguration('markdown').update('styles', [], vscode.ConfigurationTarget.Global);
                
                // Force refresh
                try {
                    await vscode.commands.executeCommand('markdown.preview.refresh');
                } catch (refreshError) {
                    console.log('Refresh failed:', refreshError.message);
                }
                
                vscode.window.showInformationMessage('Markdown styles reset. Select a theme to reapply styling.');
                console.log('[Markdown Navigator] Styles completely reset');
            } catch (error) {
                console.error('Error resetting styles:', error);
                vscode.window.showErrorMessage(`Error resetting styles: ${error.message}`);
            }
        })
    );

    // Apply theme on activation
    const config = vscode.workspace.getConfiguration('markdownNavigator');
    const currentTheme = config.get('previewTheme', 'default');
    if (currentTheme !== 'default') {
        applyMarkdownTheme(context, currentTheme);
    }

    console.log('Markdown Navigator extension activated successfully');
}

/**
 * Apply the selected theme by updating VS Code's markdown preview styles
 * @param {vscode.ExtensionContext} context The extension context
 * @param {string|null} themeName Optional theme name override
 * @returns {Promise<boolean>} Success status
 */
async function applyMarkdownTheme(context, themeName = null) {
    try {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        const currentTheme = themeName || config.get('previewTheme', 'default');
        const customCssPath = String(config.get('customCssPath', '') || '');
        const enableCfmlHighlighting = config.get('enableCfmlHighlighting', true);

        console.log(`[Markdown Navigator] Applying theme: ${currentTheme}`);
        console.log(`[Markdown Navigator] Extension path: ${context.extensionPath}`);
        
        if (customCssPath) {
            console.log(`[Markdown Navigator] Custom CSS path configured: ${customCssPath}`);
        }

        const fs = require('fs');

        // Get current styles and completely remove all our previous entries
        const currentStyles = vscode.workspace.getConfiguration('markdown').get('styles', []);

        // Filter out ALL our styles from previous sessions - be more aggressive
        const filteredStyles = currentStyles.filter(style => {
            if (typeof style === 'string') {
                // Remove paths that reference our extension or theme files
                const lowerStyle = style.toLowerCase();
                return !lowerStyle.includes('markdown-navigator') &&
                    !lowerStyle.includes('cfml-syntax.css') &&
                    !lowerStyle.includes('cfml-enhanced.css') &&
                    !lowerStyle.includes('cfml-enhanced-with-js.css') &&
                    !lowerStyle.includes('cfml-js-inject.css') &&
                    !lowerStyle.includes('academic.css') &&
                    !lowerStyle.includes('dark-elegant.css') &&
                    !lowerStyle.includes('dark-enhanced.css') &&
                    !lowerStyle.includes('dark-technical.css') &&
                    !lowerStyle.includes('dark-vibrant.css') &&
                    !lowerStyle.includes('github.css') &&
                    !lowerStyle.includes('light-modern.css') &&
                    !lowerStyle.includes('light-sepia.css') &&
                    !lowerStyle.includes('light-technical.css') &&
                    !lowerStyle.includes('minimal.css') &&
                    !lowerStyle.includes('default.css') &&
                    !lowerStyle.includes('md-navigator-styles');
            }
            return true;
        });

        console.log(`[Markdown Navigator] Removed ${currentStyles.length - filteredStyles.length} previous styles`);

        // Start with clean filtered styles
        let styles = [...filteredStyles];

        try {
            // Create a temp directory in a user-accessible location
            // Use the first workspace folder if available
            const workspaceFolders = vscode.workspace.workspaceFolders;
            let stylesDir;
            
            if (workspaceFolders && workspaceFolders.length > 0) {
                // Use the first workspace folder
                stylesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'md-navigator-styles');
            } else {
                // Fallback to global storage path (safer than extension path)
                stylesDir = path.join(context.globalStorageUri.fsPath, 'styles');
            }
            
            console.log(`[Markdown Navigator] Using styles directory: ${stylesDir}`);
            
            // Create the directory if it doesn't exist
            if (!fs.existsSync(stylesDir)) {
                fs.mkdirSync(stylesDir, { recursive: true });
                console.log(`[Markdown Navigator] Created styles directory: ${stylesDir}`);
            }
            
            // Copy theme CSS file to the temp directory
            if (!customCssPath) {
                let sourceThemePath;
                let destThemePath;
                
                // Construct the source path more safely
                const extensionStylesDir = path.join(context.extensionPath, 'styles');
                console.log(`[Markdown Navigator] Extension styles directory: ${extensionStylesDir}`);
                
                // Verify the styles directory exists
                if (!fs.existsSync(extensionStylesDir)) {
                    console.error(`[Markdown Navigator] Extension styles directory not found: ${extensionStylesDir}`);
                    throw new Error(`Extension styles directory not found: ${extensionStylesDir}`);
                }
                
                if (currentTheme === 'default') {
                    sourceThemePath = path.join(extensionStylesDir, 'default.css');
                    destThemePath = path.join(stylesDir, 'default.css');
                } else {
                    sourceThemePath = path.join(extensionStylesDir, `${currentTheme}.css`);
                    destThemePath = path.join(stylesDir, `${currentTheme}.css`);
                    
                    // If the theme file doesn't exist, fall back to default.css
                    if (!fs.existsSync(sourceThemePath)) {
                        console.warn(`[Markdown Navigator] Theme CSS file not found: ${sourceThemePath}, falling back to default.css`);
                        sourceThemePath = path.join(extensionStylesDir, 'default.css');
                        destThemePath = path.join(stylesDir, 'default.css');
                    }
                }
                
                console.log(`[Markdown Navigator] Copying from: ${sourceThemePath}`);
                console.log(`[Markdown Navigator] Copying to: ${destThemePath}`);
                
                // Copy the theme file
                if (fs.existsSync(sourceThemePath)) {
                    fs.copyFileSync(sourceThemePath, destThemePath);
                    console.log(`[Markdown Navigator] Successfully copied theme file`);
                    
                    // Add relative path to styles - use relative path to workspace folder
                    if (workspaceFolders && workspaceFolders.length > 0) {
                        // Get relative path from workspace root
                        const relativePath = path.relative(workspaceFolders[0].uri.fsPath, destThemePath);
                        const dotRelativePath = `./${relativePath.replace(/\\/g, '/')}`;
                        styles.push(dotRelativePath);
                        console.log(`[Markdown Navigator] Added theme CSS with relative path: ${dotRelativePath}`);
                    } else {
                        // Use file URI for better cross-platform compatibility
                        const fileUri = vscode.Uri.file(destThemePath).toString();
                        styles.push(fileUri);
                        console.log(`[Markdown Navigator] Added theme CSS with file URI: ${fileUri}`);
                    }
                } else {
                    console.error(`[Markdown Navigator] Source CSS file not found: ${sourceThemePath}`);
                    vscode.window.showErrorMessage('Markdown Navigator: Theme CSS files are missing. Please reinstall the extension.');
                    return false;
                }
            }

            // Handle CFML syntax highlighting
            if (enableCfmlHighlighting) {
                console.log(`[Markdown Navigator] CFML highlighting is enabled`);
                
                // Create a comprehensive CSS-only approach that doesn't rely on JavaScript
                const cfmlCssContent = `
/* Enhanced Code Block Styling - All Languages */

/* Base styling for all code blocks */
pre > code {
    display: block !important;
    padding: 12px !important;
    margin: 8px 0 !important;
    border-radius: 6px !important;
    font-family: 'Cascadia Code', 'Fira Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Menlo, 'DejaVu Sans Mono', 'Lucida Console', monospace !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    white-space: pre-wrap !important;
    overflow-x: auto !important;
    position: relative !important;
    border-left: 4px solid #6c757d !important; /* Default gray border */
    background-color: #f8f9fa !important;
    color: #343a40 !important;
}

/* Remove hover effects on all code blocks */
pre:hover,
pre > code:hover,
code:hover {
    background-color: inherit !important;
    opacity: 1 !important;
    transform: none !important;
    box-shadow: none !important;
    border-color: inherit !important;
}

/* Ensure no transitions that might cause hover effects */
pre,
pre > code,
code {
    transition: none !important;
}

/* Dark theme base styling */
.vscode-dark pre > code {
    background-color: #1e1e1e !important;
    color: #d4d4d4 !important;
    border-left-color: #6c757d !important;
}

/* Remove hover effects for dark theme */
.vscode-dark pre:hover,
.vscode-dark pre > code:hover,
.vscode-dark code:hover {
    background-color: #1e1e1e !important;
}

/* High contrast theme */
.vscode-high-contrast pre > code {
    background-color: #000000 !important;
    color: #ffffff !important;
    border-left-color: #ffffff !important;
}

/* Remove hover effects for high contrast theme */
.vscode-high-contrast pre:hover,
.vscode-high-contrast pre > code:hover,
.vscode-high-contrast code:hover {
    background-color: #000000 !important;
}

/* Language-specific border colors and badges */

/* JavaScript/TypeScript - Blue */
pre > code[class*="language-javascript"]::before,
pre > code[class*="language-js"]::before {
    content: "JavaScript";
}
pre > code[class*="language-javascript"],
pre > code[class*="language-js"] {
    border-left-color: #f7df1e !important;
}

pre > code[class*="language-typescript"]::before,
pre > code[class*="language-ts"]::before {
    content: "TypeScript";
}
pre > code[class*="language-typescript"],
pre > code[class*="language-ts"] {
    border-left-color: #3178c6 !important;
}

/* Python - Green */
pre > code[class*="language-python"]::before,
pre > code[class*="language-py"]::before {
    content: "Python";
}
pre > code[class*="language-python"],
pre > code[class*="language-py"] {
    border-left-color: #3776ab !important;
}

/* Java - Orange */
pre > code[class*="language-java"]::before {
    content: "Java";
}
pre > code[class*="language-java"] {
    border-left-color: #ed8b00 !important;
}

/* C# - Purple */
pre > code[class*="language-csharp"]::before,
pre > code[class*="language-cs"]::before {
    content: "C#";
}
pre > code[class*="language-csharp"],
pre > code[class*="language-cs"] {
    border-left-color: #239120 !important;
}

/* PHP - Indigo */
pre > code[class*="language-php"]::before {
    content: "PHP";
}
pre > code[class*="language-php"] {
    border-left-color: #777bb4 !important;
}

/* CSS - Pink */
pre > code[class*="language-css"]::before {
    content: "CSS";
}
pre > code[class*="language-css"] {
    border-left-color: #1572b6 !important;
}

/* HTML - Red */
pre > code[class*="language-html"]::before,
pre > code[class*="language-htm"]::before {
    content: "HTML";
}
pre > code[class*="language-html"],
pre > code[class*="language-htm"] {
    border-left-color: #e34c26 !important;
}

/* JSON - Yellow */
pre > code[class*="language-json"]::before {
    content: "JSON";
}
pre > code[class*="language-json"] {
    border-left-color: #ffd700 !important;
}

/* XML - Orange */
pre > code[class*="language-xml"]::before {
    content: "XML";
}
pre > code[class*="language-xml"] {
    border-left-color: #ff6600 !important;
}

/* SQL - Blue */
pre > code[class*="language-sql"]::before {
    content: "SQL";
}
pre > code[class*="language-sql"] {
    border-left-color: #336791 !important;
}

/* Bash/Shell - Dark Green */
pre > code[class*="language-bash"]::before,
pre > code[class*="language-shell"]::before,
pre > code[class*="language-sh"]::before {
    content: "Shell";
}
pre > code[class*="language-bash"],
pre > code[class*="language-shell"],
pre > code[class*="language-sh"] {
    border-left-color: #2d3748 !important;
}

/* PowerShell - Blue */
pre > code[class*="language-powershell"]::before,
pre > code[class*="language-ps1"]::before {
    content: "PowerShell";
}
pre > code[class*="language-powershell"],
pre > code[class*="language-ps1"] {
    border-left-color: #012456 !important;
}

/* Markdown - Gray */
pre > code[class*="language-markdown"]::before,
pre > code[class*="language-md"]::before {
    content: "Markdown";
}
pre > code[class*="language-markdown"],
pre > code[class*="language-md"] {
    border-left-color: #6c757d !important;
}

/* YAML - Purple */
pre > code[class*="language-yaml"]::before,
pre > code[class*="language-yml"]::before {
    content: "YAML";
}
pre > code[class*="language-yaml"],
pre > code[class*="language-yml"] {
    border-left-color: #cb171e !important;
}

/* Go - Cyan */
pre > code[class*="language-go"]::before {
    content: "Go";
}
pre > code[class*="language-go"] {
    border-left-color: #00add8 !important;
}

/* Rust - Orange */
pre > code[class*="language-rust"]::before,
pre > code[class*="language-rs"]::before {
    content: "Rust";
}
pre > code[class*="language-rust"],
pre > code[class*="language-rs"] {
    border-left-color: #ce422b !important;
}

/* CFML/ColdFusion - Green (removed background/color from badges) */
pre > code[class*="language-cfml"]::before {
    content: "CFML";
}
pre > code[class*="language-cfml"] {
    border-left-color: #4CAF50 !important;
}

pre > code[class*="language-coldfusion"]::before {
    content: "ColdFusion";
}
pre > code[class*="language-coldfusion"] {
    border-left-color: #4CAF50 !important;
}

pre > code[class*="language-cf"]::before {
    content: "CF";
}
pre > code[class*="language-cf"] {
    border-left-color: #4CAF50 !important;
}

pre > code[class*="language-cfscript"]::before {
    content: "CFScript";
}
pre > code[class*="language-cfscript"] {
    border-left-color: #2196F3 !important;
}

/* Language badge styling - removed background and color to prevent hover issues */
pre > code::before {
    position: absolute;
    top: -1px;
    right: 8px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: bold;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border-radius: 0 0 4px 4px;
    opacity: 0.7;
    z-index: 1;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    /* Removed background and color properties to prevent hover effects */
    background: transparent !important;
    color: currentColor !important;
}
`;

                // Write the enhanced CSS file
                const cfmlCssPath = path.join(stylesDir, 'cfml-enhanced.css');
                fs.writeFileSync(cfmlCssPath, cfmlCssContent);
                console.log(`[Markdown Navigator] Created enhanced code block CSS`);
                
                // Add to styles
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const relativePath = path.relative(workspaceFolders[0].uri.fsPath, cfmlCssPath);
                    const dotRelativePath = `./${relativePath.replace(/\\/g, '/')}`;
                    styles.push(dotRelativePath);
                    console.log(`[Markdown Navigator] Added CFML enhanced CSS: ${dotRelativePath}`);
                } else {
                    const fileUri = vscode.Uri.file(cfmlCssPath).toString();
                    styles.push(fileUri);
                    console.log(`[Markdown Navigator] Added CFML enhanced CSS: ${fileUri}`);
                }
            } else {
                console.log(`[Markdown Navigator] CFML highlighting is disabled`);
            }
        } catch (copyError) {
            console.error(`[Markdown Navigator] Error copying CSS files: ${copyError.message}`);
            console.error(`[Markdown Navigator] Error stack: ${copyError.stack}`);
            vscode.window.showErrorMessage(`Error setting up styles: ${copyError.message}`);
            return false;
        }

        console.log(`[Markdown Navigator] Final styles array has ${styles.length} items:`, styles);

        // Update the styles configuration (use Workspace target for better isolation)
        await vscode.workspace.getConfiguration('markdown').update('styles', styles, vscode.ConfigurationTarget.Workspace);
        
        // Show confirmation message with more details for troubleshooting
        vscode.window.showInformationMessage(`Applied ${currentTheme} theme with ${styles.length} style sheets`);

        // Force refresh all markdown previews
        try {
            await vscode.commands.executeCommand('markdown.preview.refresh');
            console.log(`[Markdown Navigator] Refreshed markdown previews`);
        } catch (refreshError) {
            console.log(`[Markdown Navigator] Preview refresh failed: ${refreshError.message}`);
            try {
                await vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
                console.log(`[Markdown Navigator] Alternative refresh successful`);
            } catch (altError) {
                console.log(`[Markdown Navigator] Alternative refresh also failed: ${altError.message}`);
            }
        }

        return true;
    } catch (error) {
        console.error('[Markdown Navigator] Error applying markdown theme:', error);
        console.error('[Markdown Navigator] Error stack:', error.stack);
        vscode.window.showErrorMessage(`Error applying theme: ${error.message}`);
        return false;
    }
}

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

// Make sure to export the activate function
module.exports = {
    activate
};
