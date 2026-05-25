// Quick test of the CFML syntax highlighting logic with placeholder approach
// This tests a more robust approach to avoid HTML interference

const testContent = `public string function getUsers() {
    var result = "Hello World";
    if (len(result) GT 0) {
        return result;
    }
    return "";
}`;

console.log('Testing CFML syntax highlighting with placeholder approach...');
console.log('Original content:');
console.log(testContent);
console.log('\n' + '='.repeat(50) + '\n');

// Simulate the highlighting logic with placeholder approach
function applyCfmlSyntaxHighlighting(codeContent) {
    console.log('Applying CFML syntax highlighting patterns');
    
    try {
        // First, ensure we're working with clean content - no existing HTML spans
        let highlighted = codeContent;
        
        // Remove any existing HTML spans that might have been injected previously
        highlighted = highlighted.replace(/<span[^>]*>|<\/span>/g, '');
        
        console.log(`Cleaned content length: ${highlighted.length} characters`);

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

        // Stage 1: Comments (protect from further processing)
        highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
            return createPlaceholder(`<span class="cfml-comment">${match}</span>`);
        });
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            return createPlaceholder(`<span class="cfml-comment">${match}</span>`);
        });
        console.log('Protected comments with placeholders');

        // Stage 2: String literals (protect from further processing)  
        highlighted = highlighted.replace(/"[^"]*"/g, (match) => {
            return createPlaceholder(`<span class="cfml-string">${match}</span>`);
        });
        highlighted = highlighted.replace(/'[^']*'/g, (match) => {
            return createPlaceholder(`<span class="cfml-string">${match}</span>`);
        });
        console.log('Protected strings with placeholders');

        // Stage 3: CFML Tags
        highlighted = highlighted.replace(/<\/?(cf\w+)(?:\s[^>]*)?\/?>/g, (match) => {
            return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
        });
        console.log('Protected CFML tags with placeholders');

        // Stage 4: Component/function attributes
        highlighted = highlighted.replace(/\b(access|returntype|type|required|hint|displayname|extends|implements|inject)\s*=\s*"[^"]*"/g, (match) => {
            return createPlaceholder(`<span class="cfml-attribute">${match}</span>`);
        });
        console.log('Protected attributes with placeholders');

        // Stage 5: Keywords (now safe to apply since strings are protected)
        highlighted = highlighted.replace(/\b(public|private|package|remote)\b/g, (match) => {
            return createPlaceholder(`<span class="cfml-access">${match}</span>`);
        });
        
        highlighted = highlighted.replace(/\b(any|string|numeric|boolean|array|struct|query|void|component|date|binary)\b/g, (match) => {
            return createPlaceholder(`<span class="cfml-type">${match}</span>`);
        });
        
        highlighted = highlighted.replace(/\b(function|var|if|return|len|GT)\b/g, (match) => {
            return createPlaceholder(`<span class="cfml-keyword">${match}</span>`);
        });
        
        console.log('Applied keyword highlighting with placeholders');

        // Stage 6: Simple patterns
        highlighted = highlighted.replace(/\b(true|false|yes|no)\b/gi, (match) => {
            return createPlaceholder(`<span class="cfml-boolean">${match}</span>`);
        });
        
        highlighted = highlighted.replace(/\b\d+(?:\.\d+)?\b/g, (match) => {
            return createPlaceholder(`<span class="cfml-number">${match}</span>`);
        });
        
        highlighted = highlighted.replace(/\b(AND|OR|NOT|EQ|NEQ|LT|GT|LTE|GTE|CONTAINS|LIKE|IS|MOD)\b/gi, (match) => {
            return createPlaceholder(`<span class="cfml-operator">${match}</span>`);
        });
        
        console.log('Applied remaining patterns with placeholders');

        // Final stage: Restore all placeholders
        highlighted = restorePlaceholders(highlighted);
        
        console.log('CFML syntax highlighting completed');
        console.log(`Final highlighted content length: ${highlighted.length} characters`);
        console.log(`Used ${placeholderCounter} placeholders`);
        
        return highlighted;

    } catch (error) {
        console.log(`ERROR in CFML highlighting: ${error.message}`);
        return codeContent; // Return original on error
    }
}

const result = applyCfmlSyntaxHighlighting(testContent);

console.log('\nHighlighted result:');
console.log(result);

// Show the result with escaped characters for clearer debugging
console.log('\nHighlighted result (escaped):');
console.log(JSON.stringify(result));

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

// Check for nested spans
const nestedSpans = result.match(/<span[^>]*>[^<]*<span/g);
if (nestedSpans) {
    console.log(`❌ NESTED SPANS DETECTED: ${nestedSpans.length} instances`);
    nestedSpans.forEach((nested, i) => {
        console.log(`  ${i + 1}. ${nested}...`);
    });
} else {
    console.log('✅ No nested spans detected');
}
