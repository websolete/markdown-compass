// Test script to validate CFML syntax highlighting post-processing
const EnhancedPreviewProvider = require('./enhanced-preview-provider.js');

// Create a test instance
const provider = new EnhancedPreviewProvider();

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
const processedHtml = provider.postProcessCfmlSyntaxHighlighting(testHtmlContent);

console.log('\n=== Output HTML ===');
console.log(processedHtml);

console.log('\n=== Debug Info ===');
provider.debugInfo.forEach(info => console.log(info));

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
