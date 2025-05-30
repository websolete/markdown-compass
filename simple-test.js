const fs = require('fs');

// Test the exact implementation from the extension
function extractFirstLevelHeader(content) {
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        const headerMatch = trimmedLine.match(/^#{1}\s+(.+)$/);
        
        if (headerMatch) {
            return headerMatch[1].trim();
        }
    }
    
    return null;
}

// Test the README file
console.log('=== TESTING HEADER EXTRACTION ===');
console.log('');

const testFiles = [
    { name: 'test-display.md', expected: 'This is the Header Display Test' },
    { name: 'test-no-header.md', expected: null },
    { name: 'README.md', expected: 'Markdown Navigator' }
];

let allPassed = true;

testFiles.forEach(testFile => {
    try {
        if (fs.existsSync(testFile.name)) {
            const content = fs.readFileSync(testFile.name, 'utf8');
            const result = extractFirstLevelHeader(content);
            
            const passed = result === testFile.expected;
            allPassed = allPassed && passed;
            
            console.log(`📄 ${testFile.name}:`);
            console.log(`   Found: "${result || 'None'}"`);
            console.log(`   Expected: "${testFile.expected || 'None'}"`);
            console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
            console.log('');
        } else {
            console.log(`📄 ${testFile.name}: File not found`);
            console.log('');
        }
    } catch (error) {
        console.log(`📄 ${testFile.name}: Error - ${error.message}`);
        console.log('');
        allPassed = false;
    }
});

console.log(`Overall Test Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
