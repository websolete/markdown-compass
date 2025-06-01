// Test the CFML Enhancer functionality
const CFMLEnhancer = require('./cfml-enhancer.js');

console.log('Testing CFML Enhancer...');

const enhancer = new CFMLEnhancer();
console.log('✓ CFML Enhancer created successfully');

// Test CFML detection
const testCases = [
    '<cffunction name="test">test</cffunction>',
    '<!--- CFML Comment --->', 
    'function test() { return "hello"; }',
    '<cfquery name="users">SELECT * FROM users</cfquery>',
    'var x = 5; // not CFML'
];

testCases.forEach((code, index) => {
    const isCFML = enhancer.isCFMLCode(code);
    const metadata = enhancer.extractMetadata(code);
    
    console.log(`\nTest Case ${index + 1}:`);
    console.log(`Code: ${code.substring(0, 50)}...`);
    console.log(`Is CFML: ${isCFML}`);
    console.log(`Metadata:`, metadata);
});

console.log('\n✓ All tests completed successfully');
