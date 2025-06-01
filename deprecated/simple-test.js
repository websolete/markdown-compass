const fs = require('fs');

// Simple test without requiring the file
console.log('Testing pattern matching...');

const testCode = 'component accessors="true" displayname="ExampleEntity" {';
console.log('Test code:', testCode);

// Test basic patterns
const cfscriptKeywords = /\b(function|var|return|if|else|for|while|component|extends|implements|property|remote|public|private|package|static|final|abstract)\b/gi;

const matches = testCode.match(cfscriptKeywords);
console.log('Keyword matches:', matches);

// Test replacement
let highlighted = testCode.replace(cfscriptKeywords, '<span class="cfml-keyword">$&</span>');
console.log('After keyword highlighting:', highlighted);

// Test string pattern
const doubleQuotedString = /"([^"\\]|\\.)*"/g;
highlighted = highlighted.replace(doubleQuotedString, '<span class="cfml-string">$&</span>');
console.log('After string highlighting:', highlighted);

console.log('Test complete');
