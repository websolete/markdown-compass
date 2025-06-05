// Enhanced Preview Provider - Simplified approach focusing on core functionality
// Uses marked library for reliable markdown-to-HTML conversion

const vscode = require('vscode');
const { marked } = require('marked');
const path = require('path');

class EnhancedPreviewProvider {
    constructor() {
        this.panel = null;
        this.currentUri = null;
        this.isDisposed = false;
        this.debugInfo = [];
        this.styleWatcher = null; // Add file watcher for styles
        this.targetLineNumber = null; // For navigating to specific headers
        
        // Initialize debug mode from configuration
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        this.showDebugInfo = config.get('enhancedPreview.debugMode', false);
    }    static register(context) {
        const provider = new EnhancedPreviewProvider();
        
        // Register the command
        const disposable = vscode.commands.registerCommand('markdown-navigator.openEnhancedPreview', (node) => {
            provider.openEnhancedPreview(node);
        });
        
        // Register command to open preview at specific header
        const headerPreview = vscode.commands.registerCommand('markdown-navigator.openEnhancedPreviewAtHeader', (fileUri, lineNumber) => {
            provider.openEnhancedPreview(fileUri);
            // Store line number for future implementation of auto-scrolling to header
            provider.targetLineNumber = lineNumber;
        });
        
        // Register debug toggle command
        const debugToggle = vscode.commands.registerCommand('markdown-navigator.toggleEnhancedPreviewDebug', () => {
            provider.toggleDebugMode();
        });
          // Set up style file watcher
        provider.setupStyleWatcher(context);
        
        context.subscriptions.push(disposable, headerPreview, debugToggle);
        return provider;
    }    addDebugInfo(message) {
        const timestamp = new Date().toISOString();
        this.debugInfo.push(`[${timestamp}] ${message}`);
        console.log(`[Enhanced Preview] ${message}`);
    }
    
    async openEnhancedPreview(node) {
        try {
            this.addDebugInfo('=== Enhanced Preview Opening ===');
            
            // Handle different parameter types
            let uri = node;
            if (node && node.uri) {
                uri = node.uri;
                this.addDebugInfo(`Received node object with URI: ${uri.toString()}`);
            } else if (node && typeof node === 'string') {
                uri = vscode.Uri.file(node);
                this.addDebugInfo(`Received string path: ${node}`);
            } else if (!uri) {
                // Fallback to active editor
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    uri = activeEditor.document.uri;
                    this.addDebugInfo('Using active editor URI as fallback');
                } else {
                    throw new Error('No valid URI provided and no active editor');
                }
            }

                        this.currentUri = uri;
            this.addDebugInfo(`Opening enhanced preview for: ${uri.toString()}`);
            
            if (this.panel) {
                this.addDebugInfo('Panel exists, revealing and updating content');
                this.panel.reveal(vscode.ViewColumn.Active);
                await this.updateContent();
            } else {
                this.addDebugInfo('Creating new panel');
                await this.createPanel();
            }

        } catch (error) {
            this.addDebugInfo(`ERROR in openEnhancedPreview: ${error.message}`);
            vscode.window.showErrorMessage(`Enhanced Preview Error: ${error.message}`);        }    }

    // The openEnhancedPreviewAtHeader functionality has been integrated directly
    // into the command registration for better simplicity and maintainability
    
    async createPanel() {
        try {
            this.addDebugInfo(`Creating panel for file: ${this.currentUri.fsPath}`);
            
            // Read file content early to generate intelligent title
            let tabTitle = 'Enhanced Markdown Preview';
            try {
                const content = await vscode.workspace.fs.readFile(this.currentUri);
                const markdownText = Buffer.from(content).toString('utf8');
                tabTitle = this.generateTabTitle(markdownText, this.currentUri);
            } catch (titleError) {
                this.addDebugInfo(`Error reading file for title generation: ${titleError.message}`);
                // Use fallback title based on filename
                const filename = path.basename(this.currentUri.fsPath, path.extname(this.currentUri.fsPath));
                tabTitle = filename || 'Enhanced Markdown Preview';
            }
            
            // Set up local resource roots for webview
            const localResourceRoots = [
                vscode.Uri.file(path.dirname(this.currentUri.fsPath)),
                vscode.Uri.file(path.join(__dirname, 'styles')),
                vscode.Uri.file(__dirname)
            ];
            
            // Add workspace styles directory if it exists
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceStylesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'md-navigator-styles');
                localResourceRoots.push(vscode.Uri.file(workspaceStylesDir));
            }
            
            this.panel = vscode.window.createWebviewPanel(
                'enhancedMarkdownPreview',
                tabTitle,
                vscode.ViewColumn.Active,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: localResourceRoots
                }
            );            // Set the icon for the tab with both light and dark variants for better visibility
            this.panel.iconPath = {
                light: vscode.Uri.file(path.join(__dirname, 'icon.png')),
                dark: vscode.Uri.file(path.join(__dirname, 'icon.png'))
            };
            this.addDebugInfo(`Set colored icon with light/dark variants for enhanced preview tab`);

            this.addDebugInfo('Panel created successfully');

            this.panel.onDidDispose(() => {
                this.addDebugInfo('Panel disposed');
                this.panel = null;
                this.isDisposed = true;
            });

            // Add a small delay to ensure panel is fully initialized
            this.addDebugInfo('Waiting for panel initialization...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            this.addDebugInfo('Starting content update...');
            await this.updateContent();

        } catch (error) {
            this.addDebugInfo(`ERROR in createPanel: ${error.message}`);
            this.addDebugInfo(`Error stack: ${error.stack}`);
            throw error;        }
    }

    async updateContent() {
        try {
            this.addDebugInfo(`updateContent called - panel exists: ${!!this.panel}, disposed: ${this.isDisposed}`);
            
            if (!this.panel || this.isDisposed) {
                this.addDebugInfo('Cannot update content - panel disposed or null');
                return;
            }

            this.addDebugInfo(`Reading file: ${this.currentUri.fsPath}`);
              // Check if file exists and is readable
            try {
                const content = await vscode.workspace.fs.readFile(this.currentUri);
                let markdownText = Buffer.from(content).toString('utf8');
                this.addDebugInfo(`File content length: ${markdownText.length} characters`);
                
                // Update panel title with intelligent title based on content
                if (this.panel && !this.isDisposed) {
                    const newTitle = this.generateTabTitle(markdownText, this.currentUri);
                    this.panel.title = newTitle;
                    this.addDebugInfo(`Updated panel title to: ${newTitle}`);
                }// Pre-process CFML code blocks BEFORE markdown conversion
                this.addDebugInfo('Pre-processing CFML code blocks...');
                markdownText = this.preprocessCfmlCodeBlocks(markdownText);

                // Convert markdown to HTML using marked
                this.addDebugInfo('Converting markdown to HTML with marked library');
                let htmlContent = await marked(markdownText);
                this.addDebugInfo(`Generated HTML content length: ${htmlContent.length} characters`);
                
                // Post-process CFML code blocks AFTER markdown conversion
                this.addDebugInfo('Post-processing CFML syntax highlighting...');
                htmlContent = this.postProcessCfmlSyntaxHighlighting(htmlContent);
                
                // Generate full HTML page
                this.addDebugInfo('Generating full HTML page...');
                const fullHtml = this.generateHtmlPage(htmlContent);
                
                // Check panel is still valid before setting content
                if (!this.panel || this.isDisposed) {
                    this.addDebugInfo('Panel became null/disposed during processing');
                    return;
                }
                
                this.addDebugInfo('Setting webview HTML content');
                this.panel.webview.html = fullHtml;
                
                this.addDebugInfo('Content update completed successfully');
                
            } catch (fileError) {
                this.addDebugInfo(`File reading error: ${fileError.message}`);
                throw fileError;
            }

        } catch (error) {
            this.addDebugInfo(`ERROR in updateContent: ${error.message}`);
            this.addDebugInfo(`Error stack: ${error.stack}`);
            
            if (this.panel && !this.isDisposed) {
                try {
                    this.panel.webview.html = this.generateErrorPage(error.message);
                } catch (htmlError) {
                    this.addDebugInfo(`Error setting error page: ${htmlError.message}`);
                }
            }
        }
    }

    preprocessCfmlCodeBlocks(markdownText) {
        this.addDebugInfo('Pre-processing CFML code blocks (identification only)');
        
        try {
            // Find CFML code blocks and just count them - no HTML injection at this stage
            const cfmlCodeBlockPattern = /```cfml\n([\s\S]*?)\n```/g;
            
            // Count matches for debugging
            const matches = [...markdownText.matchAll(cfmlCodeBlockPattern)];
            this.addDebugInfo(`Found ${matches.length} CFML code blocks for later post-processing`);
            
            // Return unchanged markdown text - post-processing will handle syntax highlighting
            this.addDebugInfo('Pre-processing completed - passing through unchanged for marked conversion');
            return markdownText;
            
        } catch (error) {
            this.addDebugInfo(`ERROR in CFML preprocessing: ${error.message}`);
            return markdownText; // Return original on error
        }
    }

    applyCfmlSyntaxHighlighting(codeContent) {
        this.addDebugInfo('Applying CFML-specific syntax highlighting to raw text');
        
        try {
            let highlighted = codeContent;
            
            // Enhanced CFML-specific highlighting patterns for raw text
            // Order matters - more specific patterns first to avoid conflicts
            const cfmlPatterns = [
                // Multi-line comments
                { 
                    pattern: /\/\*[\s\S]*?\*\//g, 
                    replacement: '<span class="cfml-comment">$&</span>',
                    name: 'multi-line comments'
                },
                // Single-line comments
                { 
                    pattern: /\/\/.*$/gm, 
                    replacement: '<span class="cfml-comment">$&</span>',
                    name: 'single-line comments'
                },
                // String literals (double quotes)
                { 
                    pattern: /"(?:[^"\\]|\\.)*"/g, 
                    replacement: '<span class="cfml-string">$&</span>',
                    name: 'double-quoted strings'
                },
                // String literals (single quotes)
                { 
                    pattern: /'(?:[^'\\]|\\.)*'/g, 
                    replacement: '<span class="cfml-string">$&</span>',
                    name: 'single-quoted strings'
                },
                // CFML Tags (opening and closing)
                { 
                    pattern: /<\/?(cf\w+)(?:\s[^>]*)?\/?>/g, 
                    replacement: '<span class="cfml-tag">$&</span>',
                    name: 'CFML tags'
                },
                // Component/function attributes
                { 
                    pattern: /\b(access|returntype|type|required|hint|displayname|extends|implements|inject)\s*=\s*"[^"]*"/g, 
                    replacement: '<span class="cfml-attribute">$&</span>',
                    name: 'CFML attributes'
                },
                // Access modifiers
                { 
                    pattern: /\b(public|private|package|remote)\b/g, 
                    replacement: '<span class="cfml-access">$1</span>',
                    name: 'access modifiers'
                },
                // Data types
                { 
                    pattern: /\b(any|string|numeric|boolean|array|struct|query|void|component|date|binary)\b/g, 
                    replacement: '<span class="cfml-type">$1</span>',
                    name: 'data types'
                },
                // CFML/CFScript keywords and functions
                { 
                    pattern: /\b(function|var|arguments|required|len|queryExecute|cfquery|cfoutput|cfset|cfreturn|cfif|cfelse|cfelseif|cfloop|cfswitch|cfcase|cfdefaultcase|cftry|cfcatch|cffinally|cfthrow|component|property|extends|implements|transaction|throw|writeLog|structKeyExists|isValid|isNull|isNumeric|deserializeJSON|serializeJSON|arrayEach|structEach|queryNew|if|else|for|while|do|switch|case|default|try|catch|finally|return|break|continue|this|super|variables|application|session|request|form|url|cgi|server|cookie)\b/g, 
                    replacement: '<span class="cfml-keyword">$1</span>',
                    name: 'CFML keywords'
                },
                // Boolean values
                { 
                    pattern: /\b(true|false|yes|no)\b/gi, 
                    replacement: '<span class="cfml-boolean">$1</span>',
                    name: 'boolean values'
                },
                // Numbers
                { 
                    pattern: /\b\d+(?:\.\d+)?\b/g, 
                    replacement: '<span class="cfml-number">$&</span>',
                    name: 'numbers'
                },
                // Operators
                { 
                    pattern: /\b(AND|OR|NOT|EQ|NEQ|LT|GT|LTE|GTE|CONTAINS|LIKE|IS|MOD)\b/gi, 
                    replacement: '<span class="cfml-operator">$1</span>',
                    name: 'CFML operators'
                }
            ];

            cfmlPatterns.forEach(pattern => {
                const beforeCount = (highlighted.match(pattern.pattern) || []).length;
                highlighted = highlighted.replace(pattern.pattern, pattern.replacement);
                this.addDebugInfo(`Applied ${pattern.name}: ${beforeCount} matches processed`);
            });

            this.addDebugInfo('CFML syntax highlighting completed');
            return highlighted;

        } catch (error) {
            this.addDebugInfo(`ERROR in CFML highlighting: ${error.message}`);
            return codeContent; // Return original on error
        }
    }

    postProcessCfmlSyntaxHighlighting(htmlContent) {
        this.addDebugInfo('Post-processing CFML syntax highlighting in HTML content');
        
        try {
            // Find CFML code blocks in the HTML output from marked
            const cfmlCodeBlockPattern = /<pre><code class="language-cfml">([\s\S]*?)<\/code><\/pre>/g;
            
            // Count matches before processing
            const matches = [...htmlContent.matchAll(cfmlCodeBlockPattern)];
            this.addDebugInfo(`Found ${matches.length} CFML code blocks in HTML to process`);
            
            const processed = htmlContent.replace(cfmlCodeBlockPattern, (match, codeContent) => {
                this.addDebugInfo(`Post-processing CFML code block with ${codeContent.length} characters`);
                
                // Decode HTML entities first
                const decodedContent = codeContent
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                
                this.addDebugInfo(`After HTML decoding: ${decodedContent.length} characters`);
                
                const highlightedCode = this.applyCfmlSyntaxHighlighting(decodedContent.trim());
                
                this.addDebugInfo(`After highlighting: ${highlightedCode.length} characters`);
                
                return `<pre><code class="language-cfml cfml-enhanced">${highlightedCode}</code></pre>`;
            });            this.addDebugInfo('CFML post-processing completed');
            return processed;

        } catch (error) {
            this.addDebugInfo(`ERROR in CFML post-processing: ${error.message}`);
            return htmlContent; // Return original on error
        }
    }

    /**
     * Get the current theme configuration
     */
    getCurrentTheme() {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        return config.get('previewTheme', 'default');
    }

    /**
     * Get custom CSS path from configuration
     */
    getCustomCssPath() {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        return config.get('customCssPath', '');
    }

    /**
     * Check if CFML highlighting is enabled
     */
    isCfmlHighlightingEnabled() {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        return config.get('enableCfmlSyntaxHighlighting', false);
    }

    /**
     * Extract the first level 1 header from markdown content
     * @param {string} content Markdown file content
     * @returns {string|null} First H1 header text or null if none found
     */
    extractMainHeader(content) {
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
     * Generate an intelligent tab title based on main header or filename
     * @param {string} content Markdown file content
     * @param {vscode.Uri} uri File URI
     * @returns {string} Tab title
     */
    generateTabTitle(content, uri) {
        try {
            // First try to extract main header
            const mainHeader = this.extractMainHeader(content);
            if (mainHeader) {
                this.addDebugInfo(`Using main header as tab title: ${mainHeader}`);
                return mainHeader;
            }

            // Fallback to filename without extension
            const filename = path.basename(uri.fsPath, path.extname(uri.fsPath));
            this.addDebugInfo(`Using filename as tab title: ${filename}`);
            return filename;
        } catch (error) {
            this.addDebugInfo(`Error generating tab title: ${error.message}`);
            return 'Enhanced Markdown Preview';
        }
    }

    /**
     * Generate CSS link tags for external stylesheets
     */
    getCssLinks() {
        if (!this.panel) {
            return '';
        }

        try {
            const fs = require('fs');
            const cssFiles = [];
            
            // Get current theme from configuration
            const currentTheme = this.getCurrentTheme();
            const customCssPath = this.getCustomCssPath();
            
            // First try to use custom CSS if specified
            if (customCssPath && customCssPath.trim()) {
                const resolvedPath = path.isAbsolute(customCssPath) ?
                    customCssPath :
                    path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', customCssPath);
                
                if (fs.existsSync(resolvedPath)) {
                    const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.file(resolvedPath));
                    cssFiles.push(`<link rel="stylesheet" href="${cssUri}">`);
                    this.addDebugInfo(`Added custom CSS: ${resolvedPath}`);
                }
            } else {
                // Check workspace-specific styles directory first (created by main extension)
                const workspaceFolders = vscode.workspace.workspaceFolders;
                let themeFound = false;
                
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const workspaceStylesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'md-navigator-styles');
                    const workspaceThemePath = path.join(workspaceStylesDir, `${currentTheme}.css`);
                    
                    if (fs.existsSync(workspaceThemePath)) {
                        const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.file(workspaceThemePath));
                        cssFiles.push(`<link rel="stylesheet" href="${cssUri}">`);
                        this.addDebugInfo(`Added workspace theme CSS: ${currentTheme}.css`);
                        themeFound = true;
                        
                        // Also check for CFML enhanced CSS in workspace
                        if (this.isCfmlHighlightingEnabled()) {
                            const workspaceCfmlPath = path.join(workspaceStylesDir, 'cfml-enhanced.css');
                            if (fs.existsSync(workspaceCfmlPath)) {
                                const cfmlUri = this.panel.webview.asWebviewUri(vscode.Uri.file(workspaceCfmlPath));
                                cssFiles.push(`<link rel="stylesheet" href="${cfmlUri}">`);
                                this.addDebugInfo(`Added workspace CFML CSS: cfml-enhanced.css`);
                            }
                        }
                    }
                }
                
                // Fallback to extension's built-in styles if not found in workspace
                if (!themeFound) {
                    const extensionPath = path.join(__dirname);
                    const stylesCssPath = path.join(extensionPath, 'styles', `${currentTheme}.css`);
                    
                    if (fs.existsSync(stylesCssPath)) {
                        const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.file(stylesCssPath));
                        cssFiles.push(`<link rel="stylesheet" href="${cssUri}">`);
                        this.addDebugInfo(`Added extension theme CSS: ${currentTheme}.css`);
                    } else {
                        // Fallback to default.css
                        const defaultCssPath = path.join(extensionPath, 'styles', 'default.css');
                        if (fs.existsSync(defaultCssPath)) {
                            const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.file(defaultCssPath));
                            cssFiles.push(`<link rel="stylesheet" href="${cssUri}">`);
                            this.addDebugInfo(`Added fallback CSS: default.css`);
                        }
                    }
                    
                    // Add CFML enhanced CSS from extension if enabled and not already added from workspace
                    if (this.isCfmlHighlightingEnabled()) {
                        const cfmlCssPath = path.join(extensionPath, 'styles', 'cfml-syntax.css');
                        
                        if (fs.existsSync(cfmlCssPath)) {
                            const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.file(cfmlCssPath));
                            cssFiles.push(`<link rel="stylesheet" href="${cssUri}">`);
                            this.addDebugInfo(`Added extension CFML CSS: cfml-syntax.css`);
                        }
                    }
                }
            }
            
            this.addDebugInfo(`Generated ${cssFiles.length} CSS links`);
            return cssFiles.join('\n    ');
            
        } catch (error) {
            this.addDebugInfo(`Error generating CSS links: ${error.message}`);
            return '<!-- CSS loading error -->';
        }
    }

    generateHtmlPage(bodyContent) {
        // Get CSS links for external stylesheets
        const cssLinks = this.getCssLinks();
        
        // Generate debug panel HTML if debug mode is enabled
        let debugPanelHtml = '';
        if (this.showDebugInfo && this.debugInfo.length > 0) {
            debugPanelHtml = `
            <div class="debug-panel" style="position: fixed; bottom: 0; right: 0; width: 50%; max-height: 40%; 
                overflow: auto; background: rgba(0,0,0,0.8); color: #00ff00; font-family: monospace; 
                padding: 10px; z-index: 9999; border-top-left-radius: 5px; font-size: 12px;">
                <h3 style="margin-top: 0; color: #ffff00;">Enhanced Preview Debug Panel</h3>
                <pre style="margin: 0; white-space: pre-wrap;">${this.debugInfo.join('\n')}</pre>
            </div>`;
        }
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Markdown Preview</title>
    ${cssLinks}
    <style>
        /* Enhanced CFML Syntax Highlighting - Inline fallback */
        .cfml-enhanced {
            background: #f8f9fa !important;
        }
        
        .cfml-access {
            color: #d73a49;
            font-weight: bold;
        }
        .cfml-type {
            color: #005cc5;
            font-weight: bold;
        }
        .cfml-keyword {
            color: #6f42c1;
            font-weight: bold;
        }
        .cfml-string {
            color: #032f62;
        }
        .cfml-comment {
            color: #6a737d;
            font-style: italic;
        }
        .cfml-tag {
            color: #22863a;
            font-weight: bold;
        }
        .cfml-operator {
            color: #e36209;
            font-weight: bold;
        }
        .cfml-attribute {
            color: #b07219;
            font-weight: normal;
        }
        .cfml-boolean {
            color: #0366d6;
            font-weight: bold;
        }
        .cfml-number {
            color: #032f62;
            font-weight: normal;
        }
        .debug-info-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: #f0f0f0;
            border-top: 1px solid #ccc;
            padding: 10px;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            color: #333;
        }
        .debug-info-panel h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .debug-info-panel ul {
            margin: 0;
            padding: 0 0 0 20px;
            list-style-type: none;
        }
        .debug-info-panel li {
            margin-bottom: 3px;
            font-family: Consolas, 'Courier New', monospace;
            white-space: pre-wrap;
        }
        .debug-info-panel .timestamp {
            color: #888;
            margin-right: 5px;
        }
    </style>
</head>
<body>
    <div class="markdown-content">
        ${bodyContent}
    </div>
    ${debugPanelHtml}
    <script>
        console.log('Enhanced Preview loaded successfully');
        
        // Log all CFML syntax highlighting classes
        const cfmlClasses = [
            'cfml-access', 'cfml-type', 'cfml-keyword', 'cfml-string', 
            'cfml-comment', 'cfml-tag', 'cfml-operator', 'cfml-attribute', 
            'cfml-boolean', 'cfml-number'
        ];
        
        let totalElements = 0;
        cfmlClasses.forEach(className => {
            const elements = document.querySelectorAll('.' + className);
            if (elements.length > 0) {
                console.log('Found ' + elements.length + ' elements with class \\'' + className + '\\'');
                elements.forEach((el, index) => {
                    if (index < 3) { // Show first 3 examples
                        console.log('  ' + className + ' example ' + (index + 1) + ': "' + el.textContent + '"');
                    }
                });
                totalElements += elements.length;
            }
        });
        
        console.log('Total CFML highlighted elements: ' + totalElements);
        
        // Check for any corrupted spans or malformed HTML
        const allSpans = document.querySelectorAll('span');
        console.log('Total spans found: ' + allSpans.length);
        
        let corruptedCount = 0;
        allSpans.forEach((span, index) => {
            if (span.textContent.includes('cfml-') && !span.className.includes('cfml-')) {
                console.warn('Potential span corruption detected:', span.outerHTML);
                corruptedCount++;
            }
        });
        
        if (corruptedCount === 0) {
            console.log('✅ No span corruption detected');
        } else {
            console.warn('⚠️ Found ' + corruptedCount + ' potentially corrupted spans');
        }
        
        // Check for CFML code blocks
        const codeBlocks = document.querySelectorAll('pre code');
        let cfmlCodeBlocks = 0;
        codeBlocks.forEach(block => {
            if (block.className.includes('language-cfml')) {
                cfmlCodeBlocks++;
                console.log('CFML code block ' + cfmlCodeBlocks + ':', block.className);
                const highlightedSpans = block.querySelectorAll('span[class*="cfml-"]');
                console.log('  Contains ' + highlightedSpans.length + ' highlighted elements');
            }
        });
        
        console.log('Found ' + cfmlCodeBlocks + ' CFML code blocks');
    </script>
</body>
</html>`;
    }

    generateErrorPage(errorMessage) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Preview Error</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .error { background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px; border: 1px solid #ef5350; }
    </style>
</head>
<body>
    <div class="error">
        <h2>Enhanced Preview Error</h2>
        <p><strong>Error:</strong> ${this.escapeHtml(errorMessage)}</p>
    </div>
</body>
</html>`;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }    dispose() {
        this.addDebugInfo('Enhanced Preview provider disposing');
        if (this.panel) {
            this.panel.dispose();
        }
        if (this.styleWatcher) {
            this.styleWatcher.dispose();
            this.styleWatcher = null;
        }
        this.isDisposed = true;
    }    setupStyleWatcher(context) {
        try {
            // Watch for changes to CSS files in the extension's styles directory
            const extensionStylesPath = path.join(__dirname, 'styles');
            const extensionPattern = new vscode.RelativePattern(extensionStylesPath, '*.css');
            
            this.styleWatcher = vscode.workspace.createFileSystemWatcher(extensionPattern);
            
            // Also watch for changes in workspace-specific styles directories
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceStylesPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'md-navigator-styles');
                const workspacePattern = new vscode.RelativePattern(workspaceStylesPath, '*.css');
                
                const workspaceWatcher = vscode.workspace.createFileSystemWatcher(workspacePattern);
                
                workspaceWatcher.onDidChange(uri => {
                    this.addDebugInfo(`Workspace style file changed: ${uri.fsPath}`);
                    this.refreshEnhancedPreview();
                });
                
                workspaceWatcher.onDidCreate(uri => {
                    this.addDebugInfo(`Workspace style file created: ${uri.fsPath}`);
                    this.refreshEnhancedPreview();
                });
                
                workspaceWatcher.onDidDelete(uri => {
                    this.addDebugInfo(`Workspace style file deleted: ${uri.fsPath}`);
                    this.refreshEnhancedPreview();
                });
                
                context.subscriptions.push(workspaceWatcher);
            }
            
            // Handle extension style file changes
            this.styleWatcher.onDidChange(uri => {
                this.addDebugInfo(`Extension style file changed: ${uri.fsPath}`);
                this.refreshEnhancedPreview();
            });
            
            this.styleWatcher.onDidCreate(uri => {
                this.addDebugInfo(`Extension style file created: ${uri.fsPath}`);
                this.refreshEnhancedPreview();
            });
            
            this.styleWatcher.onDidDelete(uri => {
                this.addDebugInfo(`Extension style file deleted: ${uri.fsPath}`);
                this.refreshEnhancedPreview();
            });
            
            context.subscriptions.push(this.styleWatcher);
            this.addDebugInfo('Style file watchers set up successfully');
            
        } catch (error) {
            this.addDebugInfo(`Error setting up style watcher: ${error.message}`);
        }
    }

    refreshEnhancedPreview() {
        if (this.panel && !this.isDisposed && this.currentUri) {
            this.addDebugInfo('Refreshing enhanced preview due to style changes');
            this.updateContent();
        }
    }    async toggleDebugMode() {
        try {
            // Toggle the debug mode
            this.showDebugInfo = !this.showDebugInfo;
            
            // Update configuration
            const config = vscode.workspace.getConfiguration('markdownNavigator');
            await config.update('enhancedPreview.debugMode', this.showDebugInfo, vscode.ConfigurationTarget.Global);
            
            this.addDebugInfo(`Debug mode ${this.showDebugInfo ? 'enabled' : 'disabled'}`);
              if (this.panel && !this.isDisposed) {
                // If panel exists, update content to show/hide debug info
                await vscode.window.showInformationMessage(`Enhanced Preview Debug Mode ${this.showDebugInfo ? 'Enabled' : 'Disabled'}`);
                
                // Add visual feedback with status bar item
                const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
                statusBarItem.text = this.showDebugInfo ? '$(bug) Enhanced Preview Debug: ON' : '$(check) Enhanced Preview Debug: OFF';
                statusBarItem.tooltip = `Enhanced Preview Debug Mode is ${this.showDebugInfo ? 'enabled' : 'disabled'}`;
                statusBarItem.show();
                
                // Auto-hide status after 3 seconds
                setTimeout(() => statusBarItem.dispose(), 3000);
                
                await this.updateContent();
            }
        } catch (error) {
            this.addDebugInfo(`ERROR in toggleDebugMode: ${error.message}`);
            console.error(`[Enhanced Preview] Error toggling debug mode: ${error.message}`);
        }
    }

    generateDebugInfoPanel() {
        if (!this.showDebugInfo || this.debugInfo.length === 0) {
            return '';
        }

        // Limit debug info display to last N entries
        const debugLimit = 50;
        const displayedDebugInfo = this.debugInfo.slice(-debugLimit);

        // Generate HTML for debug info panel
        let debugHtml = `<div style="background:#f1f1f1; padding:10px; border-radius:5px; margin-top:10px;">`;
        debugHtml += `<strong>Debug Information</strong><br/>`;
        displayedDebugInfo.forEach((info, index) => {
            debugHtml += `${index + 1}. ${info}<br/>`;
        });
        debugHtml += `</div>`;

        return debugHtml;
    }
}

module.exports = EnhancedPreviewProvider;
