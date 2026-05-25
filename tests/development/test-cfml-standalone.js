// Standalone test for CFML syntax highlighting without VS Code dependencies

// Extract just the CFML syntax highlighting method for testing
function applyCfmlSyntaxHighlighting(codeContent) {
    console.log('Applying CFML-specific syntax highlighting to raw text');
    
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
            console.log(`Applied ${pattern.name}: ${beforeCount} matches processed`);
        });

        console.log('CFML syntax highlighting completed');
        return highlighted;

    } catch (error) {
        console.log(`ERROR in CFML highlighting: ${error.message}`);
        return codeContent; // Return original on error
    }
}

function postProcessCfmlSyntaxHighlighting(htmlContent) {
    console.log('Post-processing CFML syntax highlighting in HTML content');
    
    try {
        // Find CFML code blocks in the HTML output from marked
        const cfmlCodeBlockPattern = /<pre><code class="language-cfml">([\s\S]*?)<\/code><\/pre>/g;
        
        // Count matches before processing
        const matches = [...htmlContent.matchAll(cfmlCodeBlockPattern)];
        console.log(`Found ${matches.length} CFML code blocks in HTML to process`);
        
        const processed = htmlContent.replace(cfmlCodeBlockPattern, (match, codeContent) => {
            console.log(`Post-processing CFML code block with ${codeContent.length} characters`);
            
            // Decode HTML entities first
            const decodedContent = codeContent
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
            
            console.log(`After HTML decoding: ${decodedContent.length} characters`);
            
            const highlightedCode = applyCfmlSyntaxHighlighting(decodedContent.trim());
            
            console.log(`After highlighting: ${highlightedCode.length} characters`);
            
            return `<pre><code class="language-cfml cfml-enhanced">${highlightedCode}</code></pre>`;
        });

        console.log('CFML post-processing completed');
        return processed;

    } catch (error) {
        console.log(`ERROR in CFML post-processing: ${error.message}`);
        return htmlContent; // Return original on error
    }
}

// Test HTML content that simulates output from marked library
const testHtmlContent = `
<h1>CFML Test</h1>
<p>Testing CFML syntax highlighting:</p>
<pre><code class="language-cfml">component extends="BaseComponent" {
    // Single line comment
    public string function test(required string name) {
        var result = "Hello " &amp; name;
        if (len(result) GT 0) {
            return result;
        }
        return "";
    }
}</code></pre>
<p>End of test</p>
`;

console.log('=== Testing CFML Post-Processing ===');
console.log('Input HTML:');
console.log(testHtmlContent);

console.log('\n=== Processing ===');
const processedHtml = postProcessCfmlSyntaxHighlighting(testHtmlContent);

console.log('\n=== Output HTML ===');
console.log(processedHtml);

console.log('\n=== Analysis ===');
// Check if syntax highlighting was applied
const hasHighlighting = processedHtml.includes('cfml-keyword') || 
                       processedHtml.includes('cfml-string') || 
                       processedHtml.includes('cfml-comment');

console.log(`Syntax highlighting applied: ${hasHighlighting ? 'YES' : 'NO'}`);

if (hasHighlighting) {
    console.log('✅ CFML syntax highlighting is working!');
} else {
    console.log('❌ CFML syntax highlighting is NOT working');
}
