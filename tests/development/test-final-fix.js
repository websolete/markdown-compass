// Final test to verify the CFML syntax highlighting fix
// This tests that CFML tags are protected from keyword highlighting

function applyCfmlSyntaxHighlighting(codeContent) {
    console.log('Testing improved CFML syntax highlighting...');
    
    try {
        let highlighted = codeContent;
        
        // Remove any existing HTML spans
        highlighted = highlighted.replace(/<span[^>]*>|<\/span>/g, '');
        
        // Use a placeholder-based approach
        const placeholders = new Map();
        let placeholderCounter = 0;

        const createPlaceholder = (content) => {
            const placeholder = `__CFML_PLACEHOLDER_${placeholderCounter++}__`;
            placeholders.set(placeholder, content);
            return placeholder;
        };

        const restorePlaceholders = (text) => {
            let result = text;
            for (const [placeholder, content] of placeholders) {
                result = result.replace(new RegExp(placeholder, 'g'), content);
            }
            return result;
        };

        // STAGE 1: Protect ALL CFML tags completely
        console.log('Stage 1: Protecting CFML tags...');
        
        // Self-closing CFML tags
        highlighted = highlighted.replace(/<(cf\w+)(\s[^>]*)?\s*\/>/g, (match) => {
            console.log(`  Protected self-closing tag: ${match}`);
            return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
        });
        
        // Opening CFML tags
        highlighted = highlighted.replace(/<(cf\w+)(\s[^>]*)?>/g, (match) => {
            console.log(`  Protected opening tag: ${match}`);
            return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
        });
        
        // Closing CFML tags
        highlighted = highlighted.replace(/<\/(cf\w+)>/g, (match) => {
            console.log(`  Protected closing tag: ${match}`);
            return createPlaceholder(`<span class="cfml-tag">${match}</span>`);
        });

        // STAGE 2: Protect strings and comments
        console.log('Stage 2: Protecting strings and comments...');
        highlighted = highlighted.replace(/"[^"]*"/g, (match) => {
            return createPlaceholder(`<span class="cfml-string">${match}</span>`);
        });
        highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
            return createPlaceholder(`<span class="cfml-comment">${match}</span>`);
        });

        // STAGE 3: Apply keyword highlighting (safe now)
        console.log('Stage 3: Applying keyword highlighting...');
        
        // Data types
        highlighted = highlighted.replace(/\b(any|string|numeric|boolean|array|struct|query|void)\b/g, (match) => {
            console.log(`  Highlighting data type: ${match}`);
            return createPlaceholder(`<span class="cfml-type">${match}</span>`);
        });
        
        // Keywords
        highlighted = highlighted.replace(/\b(function|var|if|else|for|while|return)\b/g, (match) => {
            console.log(`  Highlighting keyword: ${match}`);
            return createPlaceholder(`<span class="cfml-keyword">${match}</span>`);
        });

        // FINAL: Restore placeholders
        console.log('Final: Restoring placeholders...');
        highlighted = restorePlaceholders(highlighted);
        
        console.log(`Used ${placeholderCounter} placeholders`);
        return highlighted;

    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        return codeContent;
    }
}

// Test case that was previously causing corruption
const testContent = `<cfoutput query="getUsers">
    <div class="user">
        <h3>#name#</h3>
    </div>
</cfoutput>

<cfif isDefined("form.submit")>
    <cfset var userInput = form.userInput />
</cfif>

function getUserData(required numeric userId) {
    var query = queryExecute("SELECT * FROM users WHERE id = ?", [userId]);
    
    if (query.recordCount > 0) {
        return true;
    } else {
        return false;
    }
}`;

console.log('=== TESTING FINAL CFML SYNTAX HIGHLIGHTING FIX ===');
console.log('\nOriginal content:');
console.log(testContent);

const result = applyCfmlSyntaxHighlighting(testContent);

console.log('\n=== RESULT ===');
console.log(result);

// Verification checks
console.log('\n=== VERIFICATION ===');

// Check 1: CFML tags should be intact
const cfmlTagsIntact = result.includes('<cfoutput query="getUsers">') && 
                       result.includes('<cfif isDefined("form.submit")>');
console.log(`✅ CFML tags intact: ${cfmlTagsIntact}`);

// Check 2: Should not have corrupted spans
const hasCorruption = result.includes('query="getUsers">') && result.includes('cfml-type');
console.log(`✅ No tag corruption: ${!hasCorruption}`);

// Check 3: CFScript keywords should be highlighted
const hasKeywordHighlighting = result.includes('<span class="cfml-keyword">function</span>') &&
                               result.includes('<span class="cfml-keyword">var</span>');
console.log(`✅ CFScript keywords highlighted: ${hasKeywordHighlighting}`);

// Check 4: Data types should be highlighted
const hasTypeHighlighting = result.includes('<span class="cfml-type">numeric</span>');
console.log(`✅ Data types highlighted: ${hasTypeHighlighting}`);

const allTestsPassed = cfmlTagsIntact && !hasCorruption && hasKeywordHighlighting && hasTypeHighlighting;
console.log(`\n🎯 ALL TESTS PASSED: ${allTestsPassed}`);

if (allTestsPassed) {
    console.log('\n🚀 SUCCESS: CFML syntax highlighting fix is working correctly!');
    console.log('   - CFML tags are protected and highlighted as complete units');
    console.log('   - CFScript keywords are properly highlighted');
    console.log('   - No tag structure corruption detected');
} else {
    console.log('\n❌ FAILURE: Some tests failed, needs further investigation');
}
