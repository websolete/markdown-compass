const CFMLEnhancer = require('./cfml-enhancer');

console.log('Testing CFMLEnhancer...');

const enhancer = new CFMLEnhancer();
console.log('CFMLEnhancer created successfully');
console.log('Patterns available:', Object.keys(enhancer.patterns));

const testCode = `component accessors="true" displayname="ExampleEntity" extends="common.core.base.entity" {
    // Define table information
    variables._resource = "examples";
}`;

console.log('\n=== Input Code ===');
console.log(testCode);

console.log('\n=== Testing generateEnhancedSyntaxHighlighting ===');
try {
    const result = enhancer.generateEnhancedSyntaxHighlighting(testCode, 'cfml');
    console.log('Result length:', result.length);
    console.log('\n=== Enhanced Code ===');
    console.log(result);
    
    // Check if spans are present
    const spanCount = (result.match(/<span/g) || []).length;
    console.log('\nSpan count:', spanCount);
    
} catch (error) {
    console.error('Error in generateEnhancedSyntaxHighlighting:', error);
    console.error('Stack:', error.stack);
}
