const vscode = require('vscode');

/**
 * Custom Markdown Preview Provider with CFML syntax highlighting support
 */
class MarkdownPreviewProvider {
    constructor(context) {
        this._context = context;
        this._onDidChange = new vscode.EventEmitter();
        this.onDidChange = this._onDidChange.event;
        
        console.log('[MarkdownPreviewProvider] Initialized with CFML highlighting support');
    }

    /**
     * Provide custom document for markdown files
     */
    async openCustomDocument(uri, openContext) {
        console.log(`[Enhanced Preview] openCustomDocument called for: ${uri.fsPath}`);
        console.log(`[Enhanced Preview] openContext:`, openContext);
        
        const document = {
            uri,
            dispose: () => {
                console.log(`[Enhanced Preview] Document disposed for: ${uri.fsPath}`);
            }
        };
        
        console.log(`[Enhanced Preview] openCustomDocument returning document for: ${uri.fsPath}`);
        return document;
    }

    /**
     * Resolve the custom editor with our webview
     */
    async resolveCustomEditor(document, webviewPanel) {
        console.log(`[Enhanced Preview] resolveCustomEditor called for: ${document.uri.fsPath}`);
        console.log(`[Enhanced Preview] webviewPanel title: ${webviewPanel.title}`);
        console.log(`[Enhanced Preview] webviewPanel viewType: ${webviewPanel.viewType}`);
        
        // Configure webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'styles'),
                vscode.Uri.joinPath(this._context.extensionUri, 'assets')
            ]
        };

        console.log(`[Enhanced Preview] Webview configured, calling _updateWebviewContent...`);

        // Set up webview content
        await this._updateWebviewContent(webviewPanel.webview, document.uri);

        // Watch for file changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this._updateWebviewContent(webviewPanel.webview, document.uri);
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        
        console.log(`[Enhanced Preview] resolveCustomEditor completed for: ${document.uri.fsPath}`);
    }

    /**
     * Update webview content with processed markdown
     */
    async _updateWebviewContent(webview, uri) {
        try {
            console.log(`[Enhanced Preview] _updateWebviewContent called for: ${uri.fsPath}`);
            
            // Read the markdown file
            const content = await vscode.workspace.fs.readFile(uri);
            const markdownText = Buffer.from(content).toString('utf8');
            
            console.log(`[Enhanced Preview] Read ${markdownText.length} characters from file`);
            
            // Process CFML blocks
            const processedMarkdown = this._processCfmlBlocks(markdownText);
            console.log(`[Enhanced Preview] Processed markdown, length: ${processedMarkdown.length}`);
            
            // Convert to HTML
            const html = await this._markdownToHtml(processedMarkdown);
            console.log(`[HTML Conversion] Generated HTML, length: ${typeof html === 'string' ? html.length : 'unknown'}`);
            
            // Set webview content
            webview.html = html;
            console.log(`[Enhanced Preview] Webview content updated successfully`);
            
        } catch (error) {
            console.error(`[Enhanced Preview] Error updating webview content:`, error);
            webview.html = this._getErrorHtml(error.message);
        }
    }

    /**
     * Process markdown content to enhance CFML code blocks
     */
    _processCfmlBlocks(markdownText) {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        const cfmlLanguageIds = config.get('cfmlLanguageIds', ['cfml', 'coldfusion', 'cf', 'cfscript']);
        
        console.log(`[CFML Processing] Starting with language IDs: ${cfmlLanguageIds.join(', ')}`);
        console.log(`[CFML Processing] Input text length: ${markdownText.length}`);
        
        const langPattern = cfmlLanguageIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const cfmlBlockPattern = new RegExp('```(' + langPattern + ')\\s*\\r?\\n([\\s\\S]*?)```', 'gi');
        
        console.log(`[CFML Processing] Using regex pattern: ${cfmlBlockPattern.source}`);
        
        const testMatches = [...markdownText.matchAll(cfmlBlockPattern)];
        console.log(`[CFML Processing] Found ${testMatches.length} potential CFML blocks`);
        
        if (testMatches.length > 0) {
            testMatches.forEach((match, index) => {
                console.log(`[CFML Processing] Block ${index + 1}: ${match[1]} (${match[2].length} chars)`);
            });
        } else {
            console.log(`[CFML Processing] No CFML blocks found - checking for any code blocks at all`);
            const anyCodeBlockPattern = /```(\w+)?\s*\r?\n([\s\S]*?)```/gi;
            const anyMatches = [...markdownText.matchAll(anyCodeBlockPattern)];
            console.log(`[CFML Processing] Found ${anyMatches.length} total code blocks`);
            anyMatches.forEach((match, index) => {
                console.log(`[CFML Processing] Any block ${index + 1}: ${match[1] || 'no-lang'} (${match[2].length} chars)`);
            });
        }
        
        // Return original markdown - highlighting will be applied after HTML conversion
        console.log(`[CFML Processing] Preserving original markdown for post-HTML highlighting`);
        return markdownText;
    }

    /**
     * Convert processed markdown to HTML
     */
    async _markdownToHtml(markdownText) {
        try {
            console.log(`[HTML Conversion] Converting ${markdownText.length} characters of markdown`);
            console.log(`[HTML Conversion] Markdown sample: "${markdownText.substring(0, 200)}..."`);
            
            const html = await vscode.commands.executeCommand('markdown.api.render', markdownText);
            console.log(`[HTML Conversion] Rendered HTML length: ${typeof html === 'string' ? html.length : 'unknown'}`);
            
            if (typeof html === 'string') {
                console.log(`[HTML Conversion] HTML sample: "${html.substring(0, 200)}..."`);
                
                // Apply CFML syntax highlighting to code blocks after markdown conversion
                const highlightedHtml = this._applyCfmlSyntaxHighlighting(html);
                console.log(`[HTML Conversion] Applied CFML syntax highlighting`);
                
                const config = vscode.workspace.getConfiguration('markdownNavigator');
                const currentTheme = config.get('previewTheme', 'default');
                const enableCfmlHighlighting = config.get('enableCfmlHighlighting', true);
                
                console.log(`[Enhanced Preview] Using theme: ${currentTheme}, CFML highlighting: ${enableCfmlHighlighting}`);
                
                const themeStyles = await this._generateThemeStyles(currentTheme, enableCfmlHighlighting);
                
                const fullHtml = `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Enhanced Markdown Preview</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                            line-height: 1.6;
                            color: var(--vscode-editor-foreground, #24292e);
                            background-color: var(--vscode-editor-background, #ffffff);
                            padding: 16px;
                            max-width: none;
                            margin: 0;
                        }
                        
                        ${themeStyles}
                    </style>
                </head>
                <body>
                    <div class="markdown-body">
                        ${highlightedHtml}
                    </div>
                </body>
                </html>`;
                
                console.log(`[HTML Conversion] Generated themed HTML with CFML syntax highlighting`);
                return fullHtml;
            }
            
            return html;
            
        } catch (error) {
            console.error('Error converting markdown to HTML:', error);
            return this._getErrorHtml(error.message);
        }
    }

    /**
     * Generate theme-specific CSS styles
     */
    async _generateThemeStyles(themeName, enableCfmlHighlighting) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            let themeStyles = '';
            
            if (themeName !== 'default') {
                const themeFilePath = path.join(this._context.extensionPath, 'styles', `${themeName}.css`);
                
                if (fs.existsSync(themeFilePath)) {
                    themeStyles += fs.readFileSync(themeFilePath, 'utf8');
                    console.log(`[Theme Integration] Loaded theme CSS for: ${themeName}`);
                } else {
                    console.warn(`[Theme Integration] Theme file not found: ${themeFilePath}`);
                    const defaultThemePath = path.join(this._context.extensionPath, 'styles', 'default.css');
                    if (fs.existsSync(defaultThemePath)) {
                        themeStyles += fs.readFileSync(defaultThemePath, 'utf8');
                    }
                }
            }
            
            if (enableCfmlHighlighting) {
                themeStyles += `
                
                /* Enhanced CFML Syntax Highlighting - Integrated with Theme */
                
                code.language-cfml,
                code.language-coldfusion,
                code.language-cf,
                code.language-cfscript {
                    display: block !important;
                    padding: 16px !important;
                    margin: 16px 0 !important;
                    background: var(--vscode-textCodeBlock-background, #f8f9fa) !important;
                    border: 1px solid var(--vscode-widget-border, #e1e4e8) !important;
                    border-left: 4px solid #28a745 !important;
                    border-radius: 6px !important;
                    font-family: var(--vscode-editor-font-family, 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Menlo, monospace) !important;
                    font-size: 14px !important;
                    line-height: 1.45 !important;
                    color: var(--vscode-editor-foreground, #24292e) !important;
                    white-space: pre-wrap !important;
                    overflow-x: auto !important;
                    position: relative !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                }
                
                code.language-cfml::before,
                code.language-coldfusion::before,
                code.language-cf::before {
                    content: "CFML";
                    position: absolute;
                    top: 4px;
                    right: 8px;
                    background: #28a745;
                    color: white;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                    border-radius: 3px;
                    opacity: 0.8;
                    z-index: 10;
                }
                
                code.language-cfscript::before {
                    content: "CFScript";
                    position: absolute;
                    top: 4px;
                    right: 8px;
                    background: #6610f2;
                    color: white;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                    border-radius: 3px;
                    opacity: 0.8;
                    z-index: 10;
                }
                
                /* CFML Syntax Highlighting Classes */
                .cfml-keyword { color: #d73a49; font-weight: bold; }
                .cfml-access { color: #6f42c1; font-weight: bold; }
                .cfml-type { color: #005cc5; font-weight: bold; }
                .cfml-string { color: #032f62; }
                .cfml-comment { color: #6a737d; font-style: italic; }
                .cfml-expression { background: #fff3cd; padding: 2px 4px; border-radius: 3px; }
                .cfml-expression-content { color: #856404; font-weight: bold; }
                .cfml-number { color: #005cc5; }
                .cfml-tag { color: #22863a; }
                .cfml-tag-name { color: #22863a; font-weight: bold; }
                .cfml-attribute { color: #6f42c1; }
                `;
                
                console.log(`[Theme Integration] Added CFML syntax highlighting styles`);
            }
            
            return themeStyles;
            
        } catch (error) {
            console.error(`[Theme Integration] Error generating theme styles:`, error);
            return '/* Theme integration error */';
        }
    }

    /**
     * Apply CFML syntax highlighting to HTML after markdown conversion
     */
    _applyCfmlSyntaxHighlighting(html) {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        const cfmlLanguageIds = config.get('cfmlLanguageIds', ['cfml', 'coldfusion', 'cf', 'cfscript']);
        const enableCfmlHighlighting = config.get('enableCfmlHighlighting', true);
        
        if (!enableCfmlHighlighting) {
            console.log(`[CFML Highlighting] CFML highlighting disabled in settings`);
            return html;
        }
        
        console.log(`[CFML Highlighting] Processing HTML for language IDs: ${cfmlLanguageIds.join(', ')}`);
        
        // Create regex pattern for all supported CFML language identifiers
        const langPattern = cfmlLanguageIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const codeBlockPattern = new RegExp(`<code[^>]*class="[^"]*language-(${langPattern})[^"]*"[^>]*>([\\s\\S]*?)</code>`, 'gi');
        
        let highlightedCount = 0;
        const result = html.replace(codeBlockPattern, (match, language, code) => {
            highlightedCount++;
            console.log(`[CFML Highlighting] Processing code block ${highlightedCount}: ${language} (${code.length} chars)`);
            
            // Decode HTML entities first
            const decodedCode = this._decodeHtmlEntities(code);
            
            // Apply syntax highlighting
            const highlightedCode = this._highlightCfmlCode(decodedCode);
            
            // Return the highlighted code block
            return match.replace(code, highlightedCode);
        });
        
        console.log(`[CFML Highlighting] Applied highlighting to ${highlightedCount} CFML code blocks`);
        return result;
    }
    
    /**
     * Decode HTML entities in code content
     */
    _decodeHtmlEntities(html) {
        const entityMap = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#x60;': '`'
        };
        
        return html.replace(/&(?:amp|lt|gt|quot|#39|#x27|#x2F|#x60);/g, (match) => {
            return entityMap[match] || match;
        });
    }
    
    /**
     * Apply syntax highlighting to CFML code
     */
    _highlightCfmlCode(code) {
        console.log(`[CFML Highlighting] Highlighting code snippet: "${code.substring(0, 100)}..."`);
        
        // Detect if this is CFScript or tag-based CFML
        const isCfScript = this._detectCfScriptSyntax(code);
        console.log(`[CFML Highlighting] Detected syntax type: ${isCfScript ? 'CFScript' : 'CFML Tags'}`);
        
        if (isCfScript) {
            return this._highlightCfScript(code);
        } else {
            return this._highlightCfmlTags(code);
        }
    }
    
    /**
     * Detect if code uses CFScript syntax vs CFML tags
     */
    _detectCfScriptSyntax(code) {
        // Count CFScript indicators
        const cfScriptIndicators = [
            /\bcomponent\b/gi,
            /\bfunction\s+\w+\s*\(/gi,
            /\b(var|return|if|else|for|while|switch|case|break|continue)\b/gi,
            /\b(try|catch|finally|throw|rethrow)\b/gi,
            /\b(public|private|remote|package)\s+(function|any|string|numeric|boolean|struct|array)\b/gi,
            /variables\.\w+/gi,
            /arguments\.\w+/gi
        ];
        
        // Count CFML tag indicators  
        const cfmlTagIndicators = [
            /<cf\w+[^>]*>/gi,
            /<\/cf\w+>/gi
        ];
        
        let cfScriptScore = 0;
        let cfmlTagScore = 0;
        
        cfScriptIndicators.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) cfScriptScore += matches.length;
        });
        
        cfmlTagIndicators.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) cfmlTagScore += matches.length;
        });
        
        console.log(`[CFML Highlighting] CFScript score: ${cfScriptScore}, CFML Tag score: ${cfmlTagScore}`);
        
        // If we have any CF tags, it's tag-based, otherwise assume CFScript
        return cfmlTagScore === 0 || cfScriptScore > cfmlTagScore;
    }
    
    /**
     * Apply syntax highlighting for CFScript
     */
    _highlightCfScript(code) {
        return code
            // Keywords
            .replace(/\b(component|function|var|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|rethrow|extends|implements)\b/g, 
                '<span class="cfml-keyword">$1</span>')
            // Access modifiers and types
            .replace(/\b(public|private|remote|package|required)\b/g, 
                '<span class="cfml-access">$1</span>')
            .replace(/\b(any|string|numeric|boolean|struct|array|query|date)\b/g, 
                '<span class="cfml-type">$1</span>')
            // String literals
            .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, 
                '<span class="cfml-string">$1$2$1</span>')
            // Comments
            .replace(/\/\*[\s\S]*?\*\//g, 
                '<span class="cfml-comment">$&</span>')
            .replace(/\/\/.*$/gm, 
                '<span class="cfml-comment">$&</span>')
            // CF expressions
            .replace(/#([^#]+)#/g, 
                '<span class="cfml-expression">#<span class="cfml-expression-content">$1</span>#</span>')
            // Numbers
            .replace(/\b\d+\.?\d*\b/g, 
                '<span class="cfml-number">$&</span>');
    }
    
    /**
     * Apply syntax highlighting for CFML tags
     */
    _highlightCfmlTags(code) {
        return code
            // CFML tags
            .replace(/<(\/?)cf(\w+)([^>]*?)>/g, 
                '<span class="cfml-tag">&lt;$1cf<span class="cfml-tag-name">$2</span>$3&gt;</span>')
            // Tag attributes
            .replace(/(\w+)=(['"])(.*?)\2/g, 
                '<span class="cfml-attribute">$1</span>=<span class="cfml-string">$2$3$2</span>')
            // String literals not in attributes
            .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, 
                '<span class="cfml-string">$1$2$1</span>')
            // Comments
            .replace(/<!---[\s\S]*?--->/g, 
                '<span class="cfml-comment">$&</span>')
            // CF expressions
            .replace(/#([^#]+)#/g, 
                '<span class="cfml-expression">#<span class="cfml-expression-content">$1</span>#</span>')
            // Numbers
            .replace(/\b\d+\.?\d*\b/g, 
                '<span class="cfml-number">$&</span>');
    }

    /**
     * Generate error HTML
     */
    _getErrorHtml(errorMessage) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enhanced Preview Error</title>
        </head>
        <body>
            <h1>Enhanced Preview Error</h1>
            <p>Could not render enhanced preview:</p>
            <pre>${errorMessage}</pre>
        </body>
        </html>`;
    }
}

module.exports = MarkdownPreviewProvider;
