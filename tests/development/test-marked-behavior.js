// Test marked library behavior with HTML spans
async function test() {
    try {
        const { marked } = require('marked');
        console.log('=== TESTING MARKED LIBRARY WITH HTML SPANS ===');

        // Test 1: Regular CFML code block
        const markdown1 = '```cfml\nfunction test() {\n    return true;\n}\n```';
        const result1 = await marked(markdown1);
        console.log('\n1. Regular CFML markdown:');
        console.log('Result:', result1);

        // Test 2: Inject HTML into the result
        const injectedHtml = result1.replace(
            /<code class="language-cfml">([\s\S]*?)<\/code>/,
            (match, content) => {
                const highlighted = content.replace(/function/g, '<span class="cfml-keyword">function</span>');
                return `<code class="language-cfml">${highlighted}</code>`;
            }
        );
        console.log('\n2. After HTML injection:');
        console.log('Result:', injectedHtml);

        // Test 3: Check what's actually happening in our corrupted output
        const corruptedExample = '<cfoutput "cfml-type">query="getUsers">';
        console.log('\n3. Analyzing corruption pattern:');
        console.log('Corrupted:', corruptedExample);
        console.log('Should be: <span class="cfml-tag"><cfoutput query="getUsers"></span>');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
