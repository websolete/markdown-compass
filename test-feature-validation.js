const fs = require('fs');
const path = require('path');

// Simple test to validate header extraction
function testHeaderExtraction(content) {
    const headerRegex = /^#{1}\s+(.+)$/gm;
    const match = headerRegex.exec(content);
    if (match) {
        return match[1].trim();
    }
    return null;
}

// Test files
const testFiles = [
    'test-display.md',
    'test-no-header.md',
    'README.md'
];

console.log('Testing header extraction functionality...\n');

testFiles.forEach(filename => {
    const filepath = path.join(__dirname, filename);
    if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        const header = testHeaderExtraction(content);
        
        console.log(`File: ${filename}`);
        console.log(`Header found: ${header || 'None'}`);
        console.log(`Expected display: ${header ? `"${header}" (${filename})` : filename}`);
        console.log('---');
    } else {
        console.log(`File not found: ${filename}`);
    }
});

console.log('\nTest completed!');
