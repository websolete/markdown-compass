const CFMLEnhancer = require('./cfml-enhancer');

console.log('=== DEBUGGING CFML SYNTAX HIGHLIGHTING ===\n');

const enhancer = new CFMLEnhancer();
console.log('✓ CFMLEnhancer created');

// Test with the exact code from the user's test
const testCode = `component accessors="true" displayname="ExampleEntity" {
    // This is a comment
    variables.myVar = "test string";
    
    function getValue() {
        return variables.myVar;
    }
}`;

console.log('📝 Test Code:');
console.log(testCode);
console.log('\n' + '='.repeat(60) + '\n');

// Test step by step
console.log('🔍 Step 1: Testing generateEnhancedSyntaxHighlighting');
try {
    const result = enhancer.generateEnhancedSyntaxHighlighting(testCode, 'cfml');
    console.log('✓ Method executed successfully');
    console.log('📏 Result length:', result.length);
    console.log('🏷️  Span count:', (result.match(/<span/g) || []).length);
    
    console.log('\n📄 Full Result:');
    console.log(result);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Check for specific patterns
    console.log('🎯 Pattern Analysis:');
    const patterns = [
        { name: 'Keywords (component)', regex: /<span class="cfml-keyword">component<\/span>/g },
        { name: 'Keywords (function)', regex: /<span class="cfml-keyword">function<\/span>/g },
        { name: 'Keywords (return)', regex: /<span class="cfml-keyword">return<\/span>/g },
        { name: 'Strings ("true")', regex: /<span class="cfml-string">&quot;true&quot;<\/span>/g },
        { name: 'Strings ("test string")', regex: /<span class="cfml-string">&quot;test string&quot;<\/span>/g },
        { name: 'Comments (//)', regex: /<span class="cfml-comment">\/\/ This is a comment<\/span>/g }
    ];
    
    patterns.forEach(pattern => {
        const matches = (result.match(pattern.regex) || []).length;
        console.log(`  ${matches > 0 ? '✓' : '✗'} ${pattern.name}: ${matches} matches`);
    });
    
} catch (error) {
    console.error('❌ Error in generateEnhancedSyntaxHighlighting:', error);
    console.error('Stack:', error.stack);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test individual methods
console.log('🔍 Step 2: Testing individual highlighting methods');

console.log('\n2a. Testing escapeHtml:');
const escaped = enhancer.escapeHtml(testCode);
console.log('Input length:', testCode.length);
console.log('Escaped length:', escaped.length);
console.log('Contains &quot;:', escaped.includes('&quot;'));

console.log('\n2b. Testing highlightCFMLTags on escaped code:');
const highlighted = enhancer.highlightCFMLTags(escaped);
console.log('Highlighted length:', highlighted.length);
console.log('Span count:', (highlighted.match(/<span/g) || []).length);

console.log('\n2c. Testing highlightCFScript on raw code:');
const cfscriptHighlighted = enhancer.highlightCFScript(testCode);
console.log('CFScript highlighted length:', cfscriptHighlighted.length);
console.log('CFScript span count:', (cfscriptHighlighted.match(/<span/g) || []).length);
console.log('CFScript sample:', cfscriptHighlighted.substring(0, 200) + '...');

console.log('\n✅ Debug complete!');
