/**
 * Test script to demonstrate the Header Display Feature
 * This simulates how the extension will display markdown files in the tree
 */

const fs = require('fs');
const path = require('path');

// Simulate the MarkdownNode class
class MarkdownNode {
    constructor(label, uri, type) {
        this.label = label;
        this.uri = uri;
        this.type = type;
        this.isMarkdownFile = type === 'file' && label.toLowerCase().endsWith('.md');
        this.firstLevelHeader = null;
    }

    setFirstLevelHeader(headerText) {
        this.firstLevelHeader = headerText;
    }
}

// Simulate the header extraction method
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

// Simulate tree item creation
function createTreeItem(element) {
    let displayLabel = element.label;
    
    // For markdown files with first level headers, show header text as main label
    if (element.type === 'file' && element.isMarkdownFile && element.firstLevelHeader) {
        displayLabel = element.firstLevelHeader;
    }
    
    return {
        label: displayLabel,
        description: element.firstLevelHeader ? element.label : '',
        tooltip: element.firstLevelHeader ? 
            `${element.firstLevelHeader}\nFile: ${element.label}` : 
            element.label
    };
}

// Test the feature
console.log('🔍 MARKDOWN NAVIGATOR - Header Display Feature Test\n');

const testFiles = [
    'test-display.md',
    'README.md', 
    'test-hierarchy.md',
    'test-no-header.md',
    'CHANGELOG.md'
];

console.log('📁 Tree View Display Simulation:\n');

testFiles.forEach(filename => {
    try {
        const content = fs.readFileSync(filename, 'utf8');
        const node = new MarkdownNode(filename, filename, 'file');
        
        // Extract and set first level header
        const header = extractFirstLevelHeader(content);
        if (header) {
            node.setFirstLevelHeader(header);
        }
        
        // Create tree item
        const treeItem = createTreeItem(node);
        
        // Display result
        console.log(`📄 ${treeItem.label}`);
        if (treeItem.description) {
            console.log(`   ${treeItem.description}`);
        }
        console.log('');
        
    } catch (error) {
        console.log(`❌ ${filename} - Error: ${error.message}\n`);
    }
});

console.log('✅ Feature test completed successfully!');
console.log('\n📋 Summary:');
console.log('- Files WITH H1 headers: Display header as main label, filename as description');
console.log('- Files WITHOUT H1 headers: Display filename as main label only');
console.log('- Enhanced tooltips include both header and filename information');
