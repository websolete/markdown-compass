#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Snapshot Script for Markdown Navigator Extension
 * 
 * Creates a versioned snapshot of ALL core essential files and directories in the /snapshot directory.
 * This includes all files and directories required for a complete build and deployment of the extension.
 * 
 * Files captured: extension.js, favorites-provider.js, package.json, package-lock.json, 
 *                 CHANGELOG.md, README.md, LICENSE.md, icon files, configuration files
 * Directories captured: styles/, icons/, .vscode/
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
          // Core files to snapshot
        const filesToSnapshot = [
            'extension.js',
            'enhanced-preview-provider.js',
            'favorites-provider.js',
            'package-and-test.js',
            'package.json',
            'package-lock.json',
            'CHANGELOG.md',
            'README.md',
            'LICENSE.md',
            'images/icon.png',
            'icon.svg',
            'jsconfig.json',
            'eslint.config.mjs',
            '.vscodeignore',
            '.gitignore',
            '.vscode-test.mjs'
        ];

        // Directories to snapshot (recursively)
        const directoriesToSnapshot = [
            'styles',
            'icons',
            '.vscode'
        ];
          let copiedFiles = 0;
        let skippedFiles = 0;
        let copiedDirs = 0;

        // Function to recursively copy directories
        function copyDirectory(srcDir, destDir) {
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const entries = fs.readdirSync(srcDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const srcPath = path.join(srcDir, entry.name);
                const destPath = path.join(destDir, entry.name);

                if (entry.isDirectory()) {
                    copyDirectory(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
          // Copy each file to the version directory
        filesToSnapshot.forEach(fileName => {
            const sourcePath = path.join(__dirname, fileName);
            const destPath = path.join(versionDir, fileName);
            
            if (fs.existsSync(sourcePath)) {
                try {
                    fs.copyFileSync(sourcePath, destPath);
                    console.log(`✅ Copied file: ${fileName}`);
                    copiedFiles++;
                } catch (copyError) {
                    console.error(`❌ Error copying ${fileName}:`, copyError.message);
                }
            } else {
                console.warn(`⚠️  File not found: ${fileName}`);
                skippedFiles++;
            }
        });

        // Copy each directory to the version directory
        directoriesToSnapshot.forEach(dirName => {
            const sourcePath = path.join(__dirname, dirName);
            const destPath = path.join(versionDir, dirName);
            
            if (fs.existsSync(sourcePath) && fs.lstatSync(sourcePath).isDirectory()) {
                try {
                    copyDirectory(sourcePath, destPath);
                    console.log(`✅ Copied directory: ${dirName}`);
                    copiedDirs++;
                } catch (copyError) {
                    console.error(`❌ Error copying directory ${dirName}:`, copyError.message);
                }
            } else {
                console.warn(`⚠️  Directory not found: ${dirName}`);
                skippedFiles++;
            }
        });        // Success message
        console.log('\n🎉 Snapshot created successfully!');
        console.log(`📂 Location: ${versionDir}`);
        console.log(`📄 Files copied: ${copiedFiles}`);
        console.log(`📁 Directories copied: ${copiedDirs}`);
        if (skippedFiles > 0) {
            console.log(`⚠️  Items skipped: ${skippedFiles}`);
        }
        console.log(`🏷️  Version: ${version}`);
        
    } catch (error) {
        console.error('❌ Error creating snapshot:', error.message);
        process.exit(1);
    }
}

// Run the snapshot function
createSnapshot();
