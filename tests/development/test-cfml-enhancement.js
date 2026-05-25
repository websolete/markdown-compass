const { marked } = require('marked');

// Extract the CFML enhancement methods for standalone testing
class TestCfmlEnhancer {
    constructor() {
        this.debugInfo = [];
    }
    
    addDebugInfo(info) {
        this.debugInfo.push(`[DEBUG] ${info}`);
        console.log(`[DEBUG] ${info}`);
    }

    decodeHtmlEntities(text) {
        if (!text) return text;
        
        return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    applyCfmlSyntaxHighlighting(codeContent) {
        this.addDebugInfo('Applying CFML syntax highlighting with improved tag protection');
        
        try {
            // First, ensure we're working with clean content - no existing HTML spans
            let highlighted = codeContent;
            
            // Remove any existing HTML spans that might have been injected previously
            highlighted = highlighted.replace(/<span[^>]*>|<\/span>/g, '');
            
            this.addDebugInfo(`Cleaned content length: ${highlighted.length} characters`);

            // Use a placeholder-based approach to prevent HTML interference
            const placeholders = new Map();
            let placeholderCounter = 0;

            // Function to create a unique placeholder
            const createPlaceholder = (content) => {
                const placeholder = `__CFML_PLACEHOLDER_${placeholderCounter++}__`;
                placeholders.set(placeholder, content);
                return placeholder;
            };

            // Function to restore placeholders
            const restorePlaceholders = (text) => {
                let result = text;
                for (const [placeholder, content] of placeholders) {
                    result = result.replace(new RegExp(placeholder, 'g'), content);
                }
                return result;
            };

            // STAGE 1: Protect ALL CFML tags completely from keyword processing
            this.addDebugInfo('Stage 1: Protecting ALL CFML tags from keyword processing');
            
            // Self-closing CFML tags like <cfbreak />, <cfcontinue />
            highlighted = highlighted.replace(/<(cf\w+)(\s[^>]*)?\s*\/>/g, (match) => {
                return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
            });
            
            // Opening CFML tags like <cfoutput query="getUsers">
            highlighted = highlighted.replace(/<(cf\w+)(\s[^>]*)?>/g, (match) => {
                return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
            });
            
            // Closing CFML tags like </cfoutput>
            highlighted = highlighted.replace(/<\/(cf\w+)>/g, (match) => {
                return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
            });
            
            this.addDebugInfo('Protected all CFML tags with placeholders');

            // STAGE 2: Protect comments from further processing
            highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
                return createPlaceholder(`<span class="cfml-comment">${match}</span>`);
            });
            highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
                return createPlaceholder(`<span class="cfml-comment">${match}</span>`);
            });
            this.addDebugInfo('Protected comments with placeholders');

            // STAGE 3: Protect string literals from further processing  
            highlighted = highlighted.replace(/"[^"]*"/g, (match) => {
                return createPlaceholder(`<span class="cfml-string">${match}</span>`);
            });
            highlighted = highlighted.replace(/'[^']*'/g, (match) => {
                return createPlaceholder(`<span class="cfml-string">${match}</span>`);
            });
            this.addDebugInfo('Protected strings with placeholders');

            // STAGE 4: Now apply keyword highlighting safely to remaining content
            // Since CFML tags are protected, keywords can only match in CFScript context
            
            // Access modifiers
            highlighted = highlighted.replace(/\b(public|private|package|remote)\b/g, (match) => {
                return createPlaceholder(`<span class="cfml-access">${match}</span>`);
            });
            
            // Data types
            highlighted = highlighted.replace(/\b(any|string|numeric|boolean|array|struct|query|void|component|date|binary)\b/g, (match) => {
                return createPlaceholder(`<span class="cfml-type">${match}</span>`);
            });
            
            // CFScript keywords
            highlighted = highlighted.replace(/\b(function|var|arguments|required|len|queryExecute|if|else|for|while|do|switch|case|default|try|catch|finally|return|break|continue|this|super|variables|application|session|request|form|url|cgi|server|cookie)\b/g, (match) => {
                return createPlaceholder(`<span class="cfml-keyword">${match}</span>`);
            });
            
            this.addDebugInfo('Applied keyword highlighting with placeholders');

            // STAGE 5: Simple patterns (booleans, numbers, operators)
            highlighted = highlighted.replace(/\b(true|false|yes|no)\b/gi, (match) => {
                return createPlaceholder(`<span class="cfml-boolean">${match}</span>`);
            });
            
            highlighted = highlighted.replace(/\b\d+(?:\.\d+)?\b/g, (match) => {
                return createPlaceholder(`<span class="cfml-number">${match}</span>`);
            });
            
            highlighted = highlighted.replace(/\b(AND|OR|NOT|EQ|NEQ|LT|GT|LTE|GTE|CONTAINS|LIKE|IS|MOD)\b/gi, (match) => {
                return createPlaceholder(`<span class="cfml-operator">${match}</span>`);
            });
            
            this.addDebugInfo('Applied remaining patterns with placeholders');

            // FINAL STAGE: Restore all placeholders
            highlighted = restorePlaceholders(highlighted);
            
            this.addDebugInfo('CFML syntax highlighting completed');
            this.addDebugInfo(`Final highlighted content length: ${highlighted.length} characters`);
            this.addDebugInfo(`Used ${placeholderCounter} placeholders`);
            
            return highlighted;

        } catch (error) {
            this.addDebugInfo(`ERROR in CFML highlighting: ${error.message}`);
            return codeContent; // Return original on error
        }
    }

    enhanceCfmlInHtml(htmlContent) {
        this.addDebugInfo('Starting CFML enhancement for HTML content');
        
        try {
            // Decode any HTML entities first
            const decodedHtml = this.decodeHtmlEntities(htmlContent);
            this.addDebugInfo('HTML entities decoded');
            
            // Apply CFML syntax highlighting
            const enhancedHtml = this.applyCfmlSyntaxHighlighting(decodedHtml);
            
            this.addDebugInfo('CFML enhancement completed');
            return enhancedHtml;
            
        } catch (error) {
            this.addDebugInfo(`ERROR in enhanceCfmlInHtml: ${error.message}`);
            return htmlContent; // Return original on error
        }
    }
}

// Test with sample CFML content
const testMarkdown = `# Test CFML Document

Here's some CFML code:

<cfoutput query="getUsers">
  <p>User: #name#</p>
  <div class="user-info">
    <span>Email: #email#</span>
  </div>
</cfoutput>

<cfif condition="true">
  <div>Conditional content</div>
</cfif>

Some CFScript:
\`\`\`cfscript
function getUserInfo(string userId) {
    var query = queryExecute("SELECT * FROM users WHERE id = ?", [userId]);
    return query;
}
\`\`\`
`;

console.log('=== Testing Complete CFML Enhancement Pipeline ===\n');

const enhancer = new TestCfmlEnhancer();

// Step 1: Convert markdown to HTML
console.log('Step 1: Converting markdown to HTML...');
const htmlContent = marked(testMarkdown);
console.log('HTML Content:');
console.log(htmlContent);
console.log('\n---\n');

// Step 2: Enhance HTML with CFML syntax highlighting
console.log('Step 2: Enhancing HTML with CFML syntax highlighting...');
const enhancedHtml = enhancer.enhanceCfmlInHtml(htmlContent);
console.log('Enhanced HTML:');
console.log(enhancedHtml);
console.log('\n---\n');

// Check for problems
console.log('=== Validation ===');
const hasVisibleSpans = enhancedHtml.includes('<cfoutput "cfml-');
const hasProperSpans = enhancedHtml.includes('<span class="cfml-tag">');
const hasEscapedTags = enhancedHtml.includes('&lt;cf');

console.log('Issues found:');
console.log('- Corrupted visible spans:', hasVisibleSpans);
console.log('- Proper syntax highlighting spans:', hasProperSpans);
console.log('- Escaped CFML tags:', hasEscapedTags);

if (!hasVisibleSpans && hasProperSpans && !hasEscapedTags) {
    console.log('\n✅ CFML enhancement appears to be working correctly!');
} else {
    console.log('\n❌ Issues detected in CFML enhancement');
}
