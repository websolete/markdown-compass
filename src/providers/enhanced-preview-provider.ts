// @ts-nocheck
export {};
// Enhanced Preview Provider - Simplified approach focusing on core functionality
// Uses marked library for reliable markdown-to-HTML conversion

const vscode = require('vscode');
const { marked } = require('marked');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const { getExtensionAssetPath } = require('../utils/extension-assets');

class EnhancedPreviewProvider {    constructor(headerProvider = null, trackingState = null) {
        this.panel = null;
        this.currentUri = null;
        this.isDisposed = false;
        this.debugInfo = [];
        this.targetLineNumber = null; // For navigating to specific headers
        this.targetHeaderText = null; // For precise header text matching

        // Header tracking integration
        this.headerProvider = headerProvider;
        this.trackingState = trackingState; // Object with { getLastPreviewedFile, setLastPreviewedFile }

        // Initialize debug mode from configuration
        const config = vscode.workspace.getConfiguration('markdownNavigator');
        this.showDebugInfo = config.get('enhancedPreview.debugMode', false);
    }static register(context, headerProvider = null, trackingState = null) {
        const provider = new EnhancedPreviewProvider(headerProvider, trackingState);

        // Register the command
        const disposable = vscode.commands.registerCommand('markdown-navigator.openEnhancedPreview', (node) => {
            provider.openEnhancedPreview(node);
        });
          // Register command to open preview at specific header
        const headerPreview = vscode.commands.registerCommand('markdown-navigator.openEnhancedPreviewAtHeader', (fileUri, lineNumber, headerText) => {
            provider.openEnhancedPreview(fileUri);
            // Store both line number and header text for precise header matching
            provider.targetLineNumber = lineNumber;
            provider.targetHeaderText = headerText;
        });

                // Register debug toggle command
        const debugToggle = vscode.commands.registerCommand('markdown-navigator.toggleEnhancedPreviewDebug', () => {
            provider.toggleDebugMode();
        });

        context.subscriptions.push(disposable, headerPreview, debugToggle);
        return provider;
    }addDebugInfo(message) {
        const timestamp = new Date().toISOString();
        this.debugInfo.push(`[${timestamp}] ${message}`);
        console.log(`[Enhanced Preview] ${message}`);
    }      async openEnhancedPreview(node) {        try {
            this.addDebugInfo('=== Enhanced Preview Opening ===');
            this.addDebugInfo(`Current state: panel=${!!this.panel}, isDisposed=${this.isDisposed}`);

            // Clear target values when opening normally (not via header navigation)
            this.targetLineNumber = null;
            this.targetHeaderText = null;

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
            }            this.currentUri = uri;
            this.addDebugInfo(`Opening enhanced preview for: ${uri.toString()}`);

            // Update header tracking when enhanced preview is opened
            this.updateHeaderTracking(uri);
              // Check if panel exists and is still valid (not disposed)
            if (this.panel && !this.isDisposed) {
                this.addDebugInfo('Panel exists and is valid, revealing and updating content');
                try {
                    this.panel.reveal(vscode.ViewColumn.Active);
                    await this.updateContent();
                } catch (revealError) {
                    this.addDebugInfo(`Error revealing panel: ${revealError.message}`);
                    this.addDebugInfo('Panel appears to be invalid, forcing recreation');
                    // Force reset and recreate
                    this.panel = null;
                    this.isDisposed = false;
                    await this.createPanel();
                }
            } else {
                // Reset disposed state and panel reference if needed
                if (this.isDisposed || this.panel) {
                    this.addDebugInfo('Panel was disposed or invalid, resetting state');
                    this.panel = null;
                    this.isDisposed = false;
                }
                this.addDebugInfo('Creating new panel');
                await this.createPanel();
            }

        } catch (error) {
            this.addDebugInfo(`ERROR in openEnhancedPreview: ${error.message}`);
            vscode.window.showErrorMessage(`Enhanced Preview Error: ${error.message}`);        }    }

    // The openEnhancedPreviewAtHeader functionality has been integrated directly
    // into the command registration for better simplicity and maintainability

    getRetainedStylesPath() {
        return getExtensionAssetPath('styles');
    }

    getRetainedWebviewsPath() {
        return getExtensionAssetPath('webviews');
    }

    getLocalResourceRoots() {
        const roots = [];
        const seen = new Set();

        const addRoot = rootPath => {
            if (!rootPath || !fs.existsSync(rootPath)) {
                return;
            }

            const normalizedPath = path.normalize(rootPath);
            if (seen.has(normalizedPath)) {
                return;
            }

            seen.add(normalizedPath);
            roots.push(vscode.Uri.file(rootPath));
        };

        if (this.currentUri && this.currentUri.fsPath) {
            addRoot(path.dirname(this.currentUri.fsPath));
        }

        addRoot(this.getRetainedStylesPath());
        addRoot(this.getRetainedWebviewsPath());

        return roots;
    }

    getBaseWebviewStylesheetUri() {
        if (!this.panel) {
            return null;
        }

        const stylesheetPath = getExtensionAssetPath('styles', 'enhanced-preview-webview.css');
        if (!fs.existsSync(stylesheetPath)) {
            return null;
        }

        return this.panel.webview.asWebviewUri(vscode.Uri.file(stylesheetPath));
    }

    getWebviewScriptUri() {
        if (!this.panel) {
            return null;
        }

        const scriptPath = getExtensionAssetPath('webviews', 'enhanced-preview-webview.js');
        if (!fs.existsSync(scriptPath)) {
            return null;
        }

        return this.panel.webview.asWebviewUri(vscode.Uri.file(scriptPath));
    }

    generateNonce() {
        return crypto.randomBytes(16).toString('base64');
    }

    buildContentSecurityPolicy(nonce = null) {
        if (!this.panel) {
            return "default-src 'none'";
        }

        const cspSource = this.panel.webview.cspSource;
        const scriptSource = nonce ? `'nonce-${nonce}'` : `'none'`;

        return [
            "default-src 'none'",
            `img-src ${cspSource} https: data:`,
            `style-src ${cspSource}`,
            `font-src ${cspSource} data:`,
            `media-src ${cspSource} https: data:`,
            `script-src ${scriptSource}`,
            "base-uri 'none'",
            "form-action 'none'",
            "frame-src 'none'"
        ].join('; ');
    }

    getBodyDataAttributes() {
        const targetLineNumber = this.targetLineNumber === null || this.targetLineNumber === undefined
            ? ''
            : String(this.targetLineNumber);
        const targetHeaderText = this.targetHeaderText ? this.escapeHtml(this.targetHeaderText) : '';

        return [
            `data-target-line-number="${targetLineNumber}"`,
            `data-target-header-text="${targetHeaderText}"`
        ].join(' ');
    }

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

            // Set up the minimum local resource roots for the preview webview.
            const localResourceRoots = this.getLocalResourceRoots();

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
                light: vscode.Uri.file(getExtensionAssetPath('icon.png')),
                dark: vscode.Uri.file(getExtensionAssetPath('icon.png'))
            };
            this.addDebugInfo(`Set colored icon with light/dark variants for enhanced preview tab`);

            this.addDebugInfo('Panel created successfully');            this.panel.onDidDispose(() => {
                this.addDebugInfo('=== Panel Disposal Event ===');
                this.addDebugInfo(`Panel was disposed for file: ${this.currentUri ? this.currentUri.fsPath : 'unknown'}`);
                this.addDebugInfo('Resetting panel reference and disposed state');
                this.panel = null;
                this.isDisposed = true;
                this.addDebugInfo('Panel disposal cleanup completed');
            });// Add webview message handler
            this.panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'clearTargetLineNumber':
                            this.addDebugInfo('Received clearTargetLineNumber message from webview');
                            this.targetLineNumber = null;
                            break;
                        case 'clearTargetHeaderInfo':
                            this.addDebugInfo('Received clearTargetHeaderInfo message from webview');
                            this.targetLineNumber = null;
                            this.targetHeaderText = null;
                            break;
                        default:
                            this.addDebugInfo(`Unknown message from webview: ${message.command}`);
                    }
                },
                undefined,
                // Note: We don't add this to context.subscriptions here since the panel handles its own disposal
            );            // Add a small delay to ensure panel is fully initialized
            this.addDebugInfo('Waiting for panel initialization...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Update header tracking for the newly created panel
            this.updateHeaderTracking(this.currentUri);

            this.addDebugInfo('Starting content update...');
            await this.updateContent();} catch (error) {
            this.addDebugInfo(`ERROR in createPanel: ${error.message}`);
            this.addDebugInfo(`Error stack: ${error.stack}`);
            throw error;        }
    }

    /**
     * Update header tracking when enhanced preview is opened
     */
    updateHeaderTracking(fileUri) {
        try {
            if (this.headerProvider && fileUri) {
                this.addDebugInfo(`Updating header tracking for: ${fileUri.toString()}`);

                // Update the header provider with the current file
                this.headerProvider.updateHeaders(fileUri);

                // Update the tracking state if available
                if (this.trackingState && this.trackingState.setLastPreviewedFile) {
                    this.trackingState.setLastPreviewedFile(fileUri);
                }

                // Set VS Code context to show that we have an active markdown document
                vscode.commands.executeCommand('setContext', 'markdownNavigatorActiveDocument', true);

                this.addDebugInfo('Header tracking updated successfully');
            } else {
                this.addDebugInfo('Header tracking not available - headerProvider or fileUri missing');
            }
        } catch (error) {
            this.addDebugInfo(`ERROR updating header tracking: ${error.message}`);
            console.error('[Enhanced Preview] Error updating header tracking:', error);
        }
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
                }

                // Convert markdown to HTML using marked
                this.addDebugInfo('Converting markdown to HTML with marked library');
                let htmlContent = await marked(markdownText);
                this.addDebugInfo(`Generated HTML content length: ${htmlContent.length} characters`);

                // Sanitize rendered markup before it reaches the script-enabled webview.
                this.addDebugInfo('Sanitizing rendered HTML output...');
                htmlContent = this.sanitizeRenderedHtml(htmlContent);

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

    sanitizeRenderedHtml(htmlContent) {
        this.addDebugInfo('Applying rendered HTML sanitization');

        try {
            const sanitizedHtml = sanitizeHtml(htmlContent, {
                allowedTags: [
                    'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'code',
                    'col', 'colgroup', 'dd', 'del', 'details', 'div', 'dl', 'dt', 'em',
                    'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i',
                    'img', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'section', 'small',
                    'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th',
                    'thead', 'tr', 'u', 'ul'
                ],
                allowedAttributes: {
                    '*': ['class', 'id', 'title', 'aria-hidden', 'aria-label'],
                    a: ['href', 'name', 'target', 'rel'],
                    img: ['src', 'alt', 'width', 'height'],
                    code: ['class'],
                    pre: ['class'],
                    span: ['class'],
                    div: ['class']
                },
                allowedSchemes: ['http', 'https', 'mailto', 'data'],
                allowedSchemesAppliedToAttributes: ['href', 'src'],
                allowedSchemesByTag: {
                    img: ['http', 'https', 'data']
                },
                allowProtocolRelative: false
            });

            this.addDebugInfo(`Sanitized rendered HTML (${htmlContent.length} -> ${sanitizedHtml.length} characters)`);
            return sanitizedHtml;
        } catch (error) {
            this.addDebugInfo(`ERROR in rendered HTML sanitization: ${error.message}`);
            return htmlContent;
        }
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
            const cssFiles = [];
            const baseStylesheetUri = this.getBaseWebviewStylesheetUri();

            if (baseStylesheetUri) {
                cssFiles.push(`<link rel="stylesheet" href="${baseStylesheetUri}">`);
                this.addDebugInfo('Added VS Code-native preview base stylesheet');
            }

            this.addDebugInfo(`Generated ${cssFiles.length} CSS links`);
            return cssFiles.join('\n    ');

        } catch (error) {
            this.addDebugInfo(`Error generating CSS links: ${error.message}`);
            return '<!-- CSS loading error -->';
        }
    }

    generateHtmlPage(bodyContent) {
        const cssLinks = this.getCssLinks();
        const scriptUri = this.getWebviewScriptUri();
        const nonce = scriptUri ? this.generateNonce() : null;
        const bodyAttributes = this.getBodyDataAttributes();
        const contentSecurityPolicy = this.buildContentSecurityPolicy(nonce);

        let debugPanelHtml = '';
        if (this.showDebugInfo && this.debugInfo.length > 0) {
            debugPanelHtml = `
            <div class="debug-panel">
                <h3 class="debug-panel-title">Enhanced Preview Debug Panel</h3>
                <pre class="debug-panel-log">${this.escapeHtml(this.debugInfo.join('\n'))}</pre>
            </div>`;
        }

        const scriptTag = scriptUri
            ? `<script defer nonce="${nonce}" src="${scriptUri}"></script>`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Markdown Preview</title>
    ${cssLinks}
</head>
<body ${bodyAttributes}>
    <div class="markdown-content">
        ${bodyContent}
    </div>
    ${debugPanelHtml}
    ${scriptTag}
</body>
</html>`;
    }

    generateErrorPage(errorMessage) {
        const cssLinks = this.getCssLinks();
        const contentSecurityPolicy = this.buildContentSecurityPolicy();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Preview Error</title>
    ${cssLinks}
</head>
<body>
    <div class="error-page">
        <div class="error">
            <h2>Enhanced Preview Error</h2>
            <p><strong>Error:</strong> ${this.escapeHtml(errorMessage)}</p>
        </div>
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
    }

    dispose() {
        this.addDebugInfo('Enhanced Preview provider disposing');
        if (this.panel) {
            this.panel.dispose();
        }
        this.isDisposed = true;
    }

    async toggleDebugMode() {
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
}

export default EnhancedPreviewProvider;
