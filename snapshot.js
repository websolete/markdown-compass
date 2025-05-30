#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Snapshot Script for Markdown Navigator Extension
 * 
 * Creates a versioned snapshot of key extension files in the /snapshot directory.
 * Files captured: extension.js, package.json, CHANGELOG.md, README.md
 */

function createSnapshot() {
    try {
        // Read package.json to get current version
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;
        
        console.log(`📸 Creating snapshot for version ${version}...`);
        
        // Create snapshot directory if it doesn't exist
        const snapshotDir = path.join(__dirname, 'snapshot');
        if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
            console.log('📁 Created snapshot directory');
        }
        
        // Create version-specific subdirectory
        const versionDir = path.join(snapshotDir, version);
        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
            console.log(`📁 Created version directory: ${version}`);
        } else {
            console.log(`📁 Using existing version directory: ${version}`);
        }
        
        // Files to snapshot
        const filesToSnapshot = [
            'extension.js',
            'package.json',
            'CHANGELOG.md',
            'README.md'
        ];
        
        let copiedFiles = 0;
        let skippedFiles = 0;
        
        // Copy each file to the version directory
        filesToSnapshot.forEach(fileName => {
            const sourcePath = path.join(__dirname, fileName);
            const destPath = path.join(versionDir, fileName);
            
            if (fs.existsSync(sourcePath)) {
                try {
                    fs.copyFileSync(sourcePath, destPath);
                    console.log(`✅ Copied: ${fileName}`);
                    copiedFiles++;
                } catch (copyError) {
                    console.error(`❌ Error copying ${fileName}:`, copyError.message);
                }
            } else {
                console.warn(`⚠️  File not found: ${fileName}`);
                skippedFiles++;
            }
        });        
        // Success message
        console.log('\n🎉 Snapshot created successfully!');
        console.log(`📂 Location: ${versionDir}`);
        console.log(`📄 Files copied: ${copiedFiles}`);
        if (skippedFiles > 0) {
            console.log(`⚠️  Files skipped: ${skippedFiles}`);
        }
        console.log(`🏷️  Version: ${version}`);
        
    } catch (error) {
        console.error('❌ Error creating snapshot:', error.message);
        process.exit(1);
    }
}

// Run the snapshot function
createSnapshot();
