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
    }    static register(context) {
        const provider = new EnhancedPreviewProvider();
        
        // Register the command
        const disposable = vscode.commands.registerCommand('markdown-navigator.openEnhancedPreview', (node) => {
            provider.openEnhancedPreview(node);
        });
        
        context.subscriptions.push(disposable);
        return provider;
    }    addDebugInfo(message) {
        const timestamp = new Date().toISOString();
        this.debugInfo.push(`[${timestamp}] ${message}`);
        console.log(`[Enhanced Preview] ${message}`);
    }

    async openEnhancedPreview(node) {        try {
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
            this.addDebugInfo(`Opening enhanced preview for: ${uri.toString()}`);            if (this.panel) {
                this.addDebugInfo('Panel exists, revealing and updating content');
                this.panel.reveal(vscode.ViewColumn.Active);
                await this.updateContent();
            } else {
                this.addDebugInfo('Creating new panel');
                await this.createPanel();
            }

        } catch (error) {
            this.addDebugInfo(`ERROR in openEnhancedPreview: ${error.message}`);
            vscode.window.showErrorMessage(`Enhanced Preview Error: ${error.message}`);
        }
    }    async createPanel() {
        try {
            this.addDebugInfo(`Creating panel for file: ${this.currentUri.fsPath}`);              this.panel = vscode.window.createWebviewPanel(
                'enhancedMarkdownPreview',
                'Enhanced Markdown Preview',
                vscode.ViewColumn.Active,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.file(path.dirname(this.currentUri.fsPath))]
                }
            );

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
            throw error;
        }
    }    async updateContent() {
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
                this.addDebugInfo(`File content length: ${markdownText.length} characters`);                // Pre-process CFML code blocks BEFORE markdown conversion
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
    }    preprocessCfmlCodeBlocks(markdownText) {
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
    }postProcessCfmlSyntaxHighlighting(htmlContent) {
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
            });

            this.addDebugInfo('CFML post-processing completed');
            return processed;

        } catch (error) {
            this.addDebugInfo(`ERROR in CFML post-processing: ${error.message}`);
            return htmlContent; // Return original on error
        }
    }generateHtmlPage(bodyContent) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Markdown Preview</title>
    <style>
        /* Enhanced Preview Styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #ffffff;
            color: #333333;
        }

        /* Markdown Content Styles */
        h1, h2, h3, h4, h5, h6 {
            margin: 24px 0 12px 0;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { 
            font-size: 2em; 
            border-bottom: 1px solid #eaecef; 
            padding-bottom: 10px; 
        }
        h2 { 
            font-size: 1.5em; 
            border-bottom: 1px solid #eaecef; 
            padding-bottom: 8px; 
        }
        h3 { font-size: 1.25em; }
        
        p {
            margin: 12px 0;
        }

        /* Code Blocks */
        pre {
            background: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.45;
            border: 1px solid #e1e4e8;
        }

        code {
            background: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 13px;
        }        /* Enhanced CFML Syntax Highlighting */
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

        /* Lists */
        ul, ol {
            margin: 12px 0;
            padding-left: 2em;
        }
        
        /* Links */
        a {
            color: #0366d6;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }

        /* Blockquotes */
        blockquote {
            margin: 16px 0;
            padding: 0 1em;
            color: #6a737d;
            border-left: 4px solid #dfe2e5;
        }    </style>
</head>
<body>
    <div class="markdown-content">
        ${bodyContent}
    </div>    <script>
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
    }    generateErrorPage(errorMessage) {
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
        this.isDisposed = true;
    }
}

module.exports = EnhancedPreviewProvider;
