// Minimal test for CFML syntax highlighting
console.log('Starting minimal CFML test...');

const testCode = `component {
    public string function test() {
        return "hello";
    }
}`;

console.log('Input code:');
console.log(testCode);

// Test just one simple pattern
let result = testCode.replace(/\b(public|private|string|function)\b/g, '<span class="cfml-keyword">$1</span>');

console.log('Output:');
console.log(result);

console.log('Test complete.');
