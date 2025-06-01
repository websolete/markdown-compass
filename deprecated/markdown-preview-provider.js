const vscode = require('vscode');
const path = require('path');

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
        
        const document = {
            uri,
            dispose: () => {
                console.log(`[Enhanced Preview] Document disposed for: ${uri.fsPath}`);
            }
        };
        
        return document;
    }

    /**
     * Resolve the custom editor with our webview
     */
    async resolveCustomEditor(document, webviewPanel) {
        console.log(`[Enhanced Preview] resolveCustomEditor called for: ${document.uri.fsPath}`);
        
        // Set the webview panel icon using a ThemeIcon for better compatibility
        webviewPanel.iconPath = new vscode.ThemeIcon('preview', new vscode.ThemeColor('charts.blue'));
        
        // Set a distinctive title that indicates it's our enhanced preview
        const fileName = path.basename(document.uri.fsPath);
        webviewPanel.title = `Enhanced: ${fileName}`;
        
        console.log(`[Enhanced Preview] Set custom icon and title for: ${fileName}`);
        
        // Configure webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'styles'),
                vscode.Uri.joinPath(this._context.extensionUri, 'assets'),
                vscode.Uri.joinPath(this._context.extensionUri, 'icons')
            ]
        };

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
            
            // Process CFML blocks to normalize language identifiers
            const processedMarkdown = this._processCfmlBlocks(markdownText);
            
            // Convert to HTML using VS Code's native markdown renderer
            const html = await this._markdownToHtml(processedMarkdown);
            
            // Set webview content
            webview.html = html;
            console.log(`[Enhanced Preview] Webview content updated successfully`);
            
        } catch (error) {
            console.error(`[Enhanced Preview] Error updating webview content:`, error);
            webview.html = this._getErrorHtml(error.message);
        }
    }

    /**
     * Process markdown content to normalize CFML language identifiers
     */
    _processCfmlBlocks(markdownText) {
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        const cfmlLanguageIds = config.get('cfmlLanguageIds', ['cfml', 'coldfusion', 'cf', 'cfscript']);
        
        console.log(`[CFML Processing] Normalizing language identifiers: ${cfmlLanguageIds.join(', ')}`);
        
        // Normalize all CFML language identifiers to 'cfml' for VS Code's TextMate grammar
        const langPattern = cfmlLanguageIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const cfmlBlockPattern = new RegExp('```(' + langPattern + ')\\s*\\r?\\n([\\s\\S]*?)```', 'gi');
        
        const processedMarkdown = markdownText.replace(cfmlBlockPattern, (match, language, code) => {
            console.log(`[CFML Processing] Normalizing ${language} block to 'cfml' for native highlighting`);
            
            // Replace with normalized 'cfml' language identifier for VS Code's grammar
            return `\`\`\`cfml\n${code}\`\`\``;
        });
        
        return processedMarkdown;
    }

    /**
     * Convert processed markdown to HTML
     */
    async _markdownToHtml(markdownText) {
        try {
            console.log(`[HTML Conversion] Converting markdown using VS Code's native renderer`);
            
            // Let VS Code handle the syntax highlighting using TextMate grammars
            const html = await vscode.commands.executeCommand('markdown.api.render', markdownText);
            
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
                    ${html}
                </div>
            </body>
            </html>`;
            
            console.log(`[HTML Conversion] Generated complete HTML with native CFML highlighting`);
            return fullHtml;
            
        } catch (error) {
            console.error('Error converting markdown to HTML:', error);
            return this._getErrorHtml(error.message);
        }
    }

    /**
     * Generate theme-specific CSS styles - now only adds visual enhancements
     */
    async _generateThemeStyles(themeName, enableCfmlHighlighting) {
        try {
            const fs = require('fs');
            
            let themeStyles = '';
            
            // Load theme CSS
            if (themeName !== 'default') {
                const themeFilePath = path.join(this._context.extensionPath, 'styles', `${themeName}.css`);
                
                if (fs.existsSync(themeFilePath)) {
                    themeStyles += fs.readFileSync(themeFilePath, 'utf8');
                    console.log(`[Theme Integration] Loaded theme CSS for: ${themeName}`);
                }
            }
            
            // Add CFML visual enhancements (borders, badges) without touching syntax highlighting
            if (enableCfmlHighlighting) {
                themeStyles += `
                
                /* CFML Visual Enhancements - Works with VS Code's native syntax highlighting */
                
                code[class*="language-cfml"],
                code[class*="language-coldfusion"],
                code[class*="language-cf"],
                code[class*="language-cfscript"],
                pre code[class*="language-cfml"],
                pre code[class*="language-coldfusion"],
                pre code[class*="language-cf"],
                pre code[class*="language-cfscript"] {
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
                    white-space: pre-wrap !important;
                    overflow-x: auto !important;
                    position: relative !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                }
                
                /* Language badges */
                code[class*="language-cfml"]::before,
                pre code[class*="language-cfml"]::before {
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
                
                code[class*="language-coldfusion"]::before,
                pre code[class*="language-coldfusion"]::before {
                    content: "ColdFusion";
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
                
                code[class*="language-cf"]::before,
                pre code[class*="language-cf"]::before {
                    content: "CF";
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
                
                code[class*="language-cfscript"]::before,
                pre code[class*="language-cfscript"]::before {
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
                
                /* Ensure proper nesting for pre > code blocks */
                pre:has(code[class*="language-cfml"]),
                pre:has(code[class*="language-coldfusion"]),
                pre:has(code[class*="language-cf"]),
                pre:has(code[class*="language-cfscript"]) {
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                `;
                
                console.log(`[Theme Integration] Added CFML visual enhancement styles`);
            }
            
            return themeStyles;
            
        } catch (error) {
            console.error(`[Theme Integration] Error generating theme styles:`, error);
            return '/* Theme integration error */';
        }
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
