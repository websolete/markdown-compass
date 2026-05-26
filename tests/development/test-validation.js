#!/usr/bin/env node

/**
 * Quick Test Validation Script for Markdown Compass Extension
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Markdown Compass Extension Quick Validation...\n');

class QuickValidator {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
    }

    check(description, testFn) {
        try {
            const result = testFn();
            if (result === true) {
                this.results.push(`✅ ${description}`);
                console.log(`✅ ${description}`);
            } else if (result === false) {
                this.results.push(`❌ ${description}`);
                this.errors.push(description);
                console.log(`❌ ${description}`);
            } else {
                this.results.push(`⚠️ ${description}: ${result}`);
                this.warnings.push(`${description}: ${result}`);
                console.log(`⚠️ ${description}: ${result}`);
            }
        } catch (error) {
            this.results.push(`❌ ${description}: ${error.message}`);
            this.errors.push(`${description}: ${error.message}`);
            console.log(`❌ ${description}: ${error.message}`);
        }
    }

    async validate() {
        console.log('Running extension validation checks...\n');

        // Check package.json structure
        this.check('Package.json exists', () => fs.existsSync('./package.json'));
        
        this.check('Package.json has enhanced preview commands', () => {
            const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            const commands = pkg.contributes?.commands || [];
            return commands.some(cmd => cmd.command.includes('enhancedPreview') || cmd.command.includes('EnhancedPreview'));
        });

        // Check main files
        this.check('Extension.js exists', () => fs.existsSync('./extension.js'));
        this.check('Enhanced preview provider exists', () => fs.existsSync('./enhanced-preview-provider.js'));

        // Check extension.js content
        this.check('Extension has activate function', () => {
            const content = fs.readFileSync('./extension.js', 'utf8');
            return content.includes('function activate(') || content.includes('activate =');
        });

        this.check('Extension registers enhanced preview provider', () => {
            const content = fs.readFileSync('./extension.js', 'utf8');
            return content.includes('EnhancedPreviewProvider');
        });

        // Check test setup
        this.check('VS Code test config exists', () => fs.existsSync('./.vscode-test.mjs'));
        this.check('Test directory exists', () => fs.existsSync('./test'));
        this.check('Test files exist', () => {
            if (!fs.existsSync('./test')) return false;
            const testFiles = fs.readdirSync('./test').filter(f => f.endsWith('.test.js'));
            return testFiles.length > 0 ? `Found ${testFiles.length} test files` : false;
        });

        // Check dependencies
        this.check('Node modules installed', () => fs.existsSync('./node_modules'));
        
        this.check('Required dev dependencies', () => {
            const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            const devDeps = pkg.devDependencies || {};
            const required = ['@vscode/test-cli', 'mocha'];
            const missing = required.filter(dep => !devDeps[dep]);
            return missing.length === 0 ? true : `Missing: ${missing.join(', ')}`;
        });

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('VALIDATION SUMMARY');
        console.log('='.repeat(50));
        
        if (this.errors.length === 0) {
            console.log('✅ All critical checks passed!');
        } else {
            console.log(`❌ ${this.errors.length} critical issues found:`);
            this.errors.forEach(err => console.log(`   - ${err}`));
        }

        if (this.warnings.length > 0) {
            console.log(`⚠️ ${this.warnings.length} warnings:`);
            this.warnings.forEach(warn => console.log(`   - ${warn}`));
        }

        console.log('\n🚀 Next Steps:');
        if (this.errors.length === 0) {
            console.log('   1. Run: npm test (to execute unit tests)');
            console.log('   2. Test extension in VS Code development environment');
            console.log('   3. Verify enhanced preview functionality manually');
        } else {
            console.log('   1. Fix the critical issues listed above');
            console.log('   2. Re-run this validation script');
        }
    }
}

// Run validation
const validator = new QuickValidator();
validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
});
