// Quick test of the CFML syntax highlighting logic
// This tests the applyCfmlSyntaxHighlighting method logic in isolation

const testContent = `public string function getUsers() {
    var result = "Hello World";
    if (len(result) GT 0) {
        return result;
    }
    return "";
}`;

console.log('Testing CFML syntax highlighting...');
console.log('Original content:');
console.log(testContent);
console.log('\n' + '='.repeat(50) + '\n');

// Simulate the highlighting logic
function applyCfmlSyntaxHighlighting(codeContent) {
    console.log('Applying CFML syntax highlighting patterns');
    
    try {
        // First, ensure we're working with clean content - no existing HTML spans
        let highlighted = codeContent;
        
        // Remove any existing HTML spans that might have been injected previously
        highlighted = highlighted.replace(/<span[^>]*>|<\/span>/g, '');
        
        console.log(`Cleaned content length: ${highlighted.length} characters`);        // Define CFML syntax patterns with HTML-safe matching
        // Apply patterns in stages to avoid HTML attribute interference
        const cfmlPatterns = [
            // Stage 1: Comments (must be first to avoid highlighting inside comments)
            { 
                pattern: /\/\/.*$/gm, 
                replacement: '<span class="cfml-comment">$&</span>',
                name: 'single-line comments',
                stage: 1
            },
            { 
                pattern: /\/\*[\s\S]*?\*\//g, 
                replacement: '<span class="cfml-comment">$&</span>',
                name: 'multi-line comments',
                stage: 1
            },
            // Stage 2: String literals
            { 
                pattern: /"[^"]*"/g, 
                replacement: '<span class="cfml-string">$&</span>',
                name: 'double-quoted strings',
                stage: 2
            },
            { 
                pattern: /'[^']*'/g, 
                replacement: '<span class="cfml-string">$&</span>',
                name: 'single-quoted strings',
                stage: 2
            },
            // Stage 3: CFML Tags
            { 
                pattern: /<\/?(cf\w+)(?:\s[^>]*)?\/?>/g, 
                replacement: '<span class="cfml-tag">$&</span>',
                name: 'CFML tags',
                stage: 3
            },
            // Stage 4: Component/function attributes
            { 
                pattern: /\b(access|returntype|type|required|hint|displayname|extends|implements|inject)\s*=\s*"[^"]*"/g, 
                replacement: '<span class="cfml-attribute">$&</span>',
                name: 'CFML attributes',
                stage: 4
            }
        ];

        // Stage 5: Keywords that need HTML-safe matching (avoid matching inside class attributes)
        const htmlSafePatterns = [
            // Access modifiers - use custom replacement function to avoid HTML conflicts
            { 
                pattern: /\b(public|private|package|remote)\b/g,                replacement: (match, keyword, offset, string) => {
                    // Check if this match is inside a class attribute
                    const beforeMatch = string.substring(0, offset);
                    
                    // Look for class=" before this match and ensure we're not inside it
                    const lastClassStart = beforeMatch.lastIndexOf('class="');
                    const lastClassEnd = beforeMatch.lastIndexOf('"', beforeMatch.length - 1);
                    
                    // If we're inside a class attribute, don't highlight
                    if (lastClassStart > lastClassEnd && lastClassStart !== -1) {
                        return match; // Return unchanged
                    }
                    
                    return `<span class="cfml-access">${keyword}</span>`;
                },
                name: 'access modifiers',
                stage: 5
            },
            // Data types - with HTML-safe replacement
            { 
                pattern: /\b(any|string|numeric|boolean|array|struct|query|void|component|date|binary)\b/g, 
                replacement: (match, keyword, offset, string) => {
                    // Check if this match is inside a class attribute
                    const beforeMatch = string.substring(0, offset);
                    const lastClassStart = beforeMatch.lastIndexOf('class="');
                    const lastClassEnd = beforeMatch.lastIndexOf('"', beforeMatch.length - 1);
                    
                    // If we're inside a class attribute, don't highlight
                    if (lastClassStart > lastClassEnd && lastClassStart !== -1) {
                        return match; // Return unchanged
                    }
                    
                    return `<span class="cfml-type">${keyword}</span>`;
                },
                name: 'data types',
                stage: 5
            },
            // CFML/CFScript keywords - with HTML-safe replacement
            { 
                pattern: /\b(function|var|if|return|len|GT)\b/g, 
                replacement: (match, keyword, offset, string) => {
                    // Check if this match is inside a class attribute
                    const beforeMatch = string.substring(0, offset);
                    const lastClassStart = beforeMatch.lastIndexOf('class="');
                    const lastClassEnd = beforeMatch.lastIndexOf('"', beforeMatch.length - 1);
                    
                    // If we're inside a class attribute, don't highlight
                    if (lastClassStart > lastClassEnd && lastClassStart !== -1) {
                        return match; // Return unchanged
                    }
                    
                    return `<span class="cfml-keyword">${keyword}</span>`;
                },
                name: 'CFML keywords',
                stage: 5
            },
            // Numbers
            { 
                pattern: /\b\d+(?:\.\d+)?\b/g, 
                replacement: '<span class="cfml-number">$&</span>',
                name: 'numbers',
                stage: 6
            }
        ];

        // Combine all patterns
        const allPatterns = [...cfmlPatterns, ...htmlSafePatterns];        // Apply patterns with protection against re-processing
        allPatterns.forEach((pattern) => {
            const beforeContent = highlighted;
            const beforeCount = (highlighted.match(pattern.pattern) || []).length;
            
            // Apply the pattern only if we find matches
            if (beforeCount > 0) {
                // Use custom replacement function if provided, otherwise use simple replacement
                if (typeof pattern.replacement === 'function') {
                    highlighted = highlighted.replace(pattern.pattern, pattern.replacement);
                } else {
                    highlighted = highlighted.replace(pattern.pattern, pattern.replacement);
                }
                
                // Verify the replacement didn't corrupt the content
                if (highlighted.includes('<span')) {
                    console.log(`Applied ${pattern.name}: ${beforeCount} matches processed`);
                } else {
                    console.log(`WARNING: ${pattern.name} application failed - reverting`);
                    highlighted = beforeContent; // Revert on failure
                }
            } else {
                console.log(`Skipped ${pattern.name}: no matches found`);
            }
        });

        console.log('CFML syntax highlighting completed');
        console.log(`Final highlighted content length: ${highlighted.length} characters`);
        
        return highlighted;

    } catch (error) {
        console.log(`ERROR in CFML highlighting: ${error.message}`);
        return codeContent; // Return original on error
    }
}

const result = applyCfmlSyntaxHighlighting(testContent);

console.log('\nHighlighted result:');
console.log(result);

// Check for corruption patterns
console.log('\n' + '='.repeat(50));
console.log('Corruption check:');

if (result.includes('string">')) {
    console.log('❌ CORRUPTION DETECTED: Found "string">" pattern');
} else {
    console.log('✅ No obvious corruption patterns found');
}

// Count spans
const spanCount = (result.match(/<span/g) || []).length;
const endSpanCount = (result.match(/<\/span>/g) || []).length;

console.log(`Span tags: ${spanCount} opening, ${endSpanCount} closing`);

if (spanCount === endSpanCount) {
    console.log('✅ Balanced span tags');
} else {
    console.log('❌ UNBALANCED span tags');
}
