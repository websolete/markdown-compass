#!/usr/bin/env node
/* eslint-disable no-unused-vars */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

// Helper functions for colored output
const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.blue}🔹 ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.magenta}${msg}${colors.reset}`),
    gray: (msg) => console.log(`${colors.gray}   ${msg}${colors.reset}`)
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        versionType: 'patch',
        skipInstall: false,
        skipTest: false,
        dryRun: false,
        force: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--version-type':
            case '-v':
                if (i + 1 < args.length) {
                    options.versionType = args[++i];
                }
                break;

            case '--skip-install':
            case '-s':
                options.skipInstall = true;
                break;

            case '--skip-test':
            case '-t':
                options.skipTest = true;
                break;

            case '--dry-run':
            case '-d':
                options.dryRun = true;
                break;

            case '--force':
            case '-f':
                options.force = true;
                break;

            case '--help':
            case '-h':
                options.help = true;
                break;
        }
    }

    return options;
}

// Show help message
function showHelp() {
    console.log(`
${colors.cyan}Markdown Navigator Extension Package & Test Script${colors.reset}

${colors.green}Usage:${colors.reset} node package-and-test.js [OPTIONS]

${colors.yellow}Options:${colors.reset}
  -v, --version-type <type>   Version increment type: 'major', 'minor', or 'patch' (default: 'patch')
  -s, --skip-install          Skip installing the packaged extension
  -t, --skip-test             Skip opening the extension host window for testing
  -d, --dry-run               Show what would be done without making changes
  -f, --force                 Force build even with uncommitted changes
  -h, --help                  Show this help message

${colors.yellow}Examples:${colors.reset}
  node package-and-test.js                        ${colors.gray}# Increment patch version and full workflow${colors.reset}
  node package-and-test.js -v minor               ${colors.gray}# Increment minor version${colors.reset}
  node package-and-test.js --skip-install         ${colors.gray}# Package only, don't install${colors.reset}
  node package-and-test.js --skip-test            ${colors.gray}# Package and install, but don't open test window${colors.reset}
  node package-and-test.js -v major -s -t         ${colors.gray}# Major version bump, package only${colors.reset}
  node package-and-test.js --dry-run              ${colors.gray}# Preview changes without executing${colors.reset}
  node package-and-test.js --force                ${colors.gray}# Build even with uncommitted git changes${colors.reset}
`);
}

// Execute shell command with error handling
function execCommand(command, description) {
    try {
        log.gray(`Running: ${command}`);
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            cwd: __dirname 
        });
        return result;
    } catch (error) {
        log.error(`${description} failed!`);
        log.error(error.message);
        if (error.stdout) log.gray(error.stdout);
        if (error.stderr) log.gray(error.stderr);
        process.exit(1);
    }
}

// Execute shell command with error handling (non-fatal version)
function execCommandSafe(command, description) {
    try {
        log.gray(`Running: ${command}`);
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            cwd: __dirname 
        });
        return { success: true, result };
    } catch (error) {
        log.warning(`${description} failed: ${error.message}`);
        if (error.stdout) log.gray(error.stdout);
        if (error.stderr) log.gray(error.stderr);
        return { success: false, error };
    }
}

// Increment version number
function incrementVersion(currentVersion, versionType) {
    const parts = currentVersion.split('.').map(Number);
    let [major, minor, patch] = parts;

    switch (versionType.toLowerCase()) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor++;
            patch = 0;
            break;
        case 'patch':
            patch++;
            break;
        default:
            throw new Error(`Invalid version type: ${versionType}. Use 'major', 'minor', or 'patch'`);
    }

    return `${major}.${minor}.${patch}`;
}

// Move previous version VSIX files to snapshot directory
function movePreviousVersionToSnapshot(currentVersion) {
    try {
        const distDir = path.join(__dirname, 'dist');
        const snapshotDir = path.join(__dirname, 'snapshot');
        
        // Ensure snapshot directory exists
        if (!fs.existsSync(snapshotDir)) {
            fs.mkdirSync(snapshotDir, { recursive: true });
        }

        // Look for VSIX files in the dist directory (excluding current version)
        if (fs.existsSync(distDir)) {
            const files = fs.readdirSync(distDir)
                .filter(file => file.endsWith('.vsix') && !file.includes(currentVersion))
                .map(file => ({
                    name: file,
                    path: path.join(distDir, file),
                    stats: fs.statSync(path.join(distDir, file))
                }))
                .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

            files.forEach(file => {
                const snapshotPath = path.join(snapshotDir, file.name);
                fs.renameSync(file.path, snapshotPath);
                log.gray(`Moved previous version to snapshot: ${file.name}`);
            });
        }
    } catch (error) {
        log.warning(`Could not move previous versions to snapshot: ${error.message}`);
    }
}

// Open VS Code extension host window
function openExtensionHost() {
    return new Promise((resolve) => {
        // Try different VS Code command variations
        const codeCommands = ['code', 'code.cmd', 'Code.exe'];
        
        function tryNextCommand(index = 0) {
            if (index >= codeCommands.length) {
                log.warning('VS Code command not found in PATH. Skipping extension host launch.');
                log.gray(`You can manually open VS Code with: code --extensionDevelopmentPath="${__dirname}"`);
                resolve();
                return;
            }

            const command = codeCommands[index];
            
            try {
                const codeProcess = spawn(command, [
                    `--extensionDevelopmentPath=${__dirname}`,
                    __dirname
                ], {
                    detached: true,
                    stdio: 'ignore'
                });

                codeProcess.on('error', (error) => {
                    // @ts-ignore
                    if (error.code === 'ENOENT') {
                        // Command not found, try next one
                        tryNextCommand(index + 1);
                    } else {
                        log.warning(`Failed to launch VS Code: ${error.message}`);
                        resolve();
                    }
                });

                codeProcess.on('spawn', () => {
                    codeProcess.unref();
                    // Give it a moment to start
                    setTimeout(() => {
                        resolve();
                    }, 1000);
                });
            } catch (error) {
                // Catch synchronous spawn errors
                if (error.code === 'ENOENT') {
                    tryNextCommand(index + 1);
                } else {
                    log.warning(`Failed to launch VS Code: ${error.message}`);
                    resolve();
                }
            }
        }

        tryNextCommand();
    });
}

// Pre-flight checks to validate environment
async function runPreflightChecks(options = {}) {
    log.step('Running pre-flight checks...');
    
    // Check Node.js version
    try {
        const nodeVersion = process.version;
        log.gray(`Node.js version: ${nodeVersion}`);
    } catch (error) {
        log.warning('Could not determine Node.js version');
    }
    
    // Check if VSCE is available
    try {
        const vsceResult = execCommandSafe('npx vsce --version', 'VSCE version check');
        if (vsceResult.success) {
            log.gray(`VSCE available: ${vsceResult.result.trim()}`);
        } else {
            log.warning('VSCE not available - extension packaging may fail');
        }
    } catch (error) {
        log.warning('Could not check VSCE availability');
    }
    
    // Check if VS Code CLI is available
    try {
        const codeResult = execCommandSafe('code --version', 'VS Code CLI check');
        if (codeResult.success) {
            log.gray('VS Code CLI available');
        } else {
            log.warning('VS Code CLI not available - installation and testing may be manual');
        }
    } catch (error) {
        log.warning('Could not check VS Code CLI availability');
    }
    
    // Check git status for uncommitted changes
    try {
        const gitResult = execCommandSafe('git status --porcelain', 'Git status check');
        if (gitResult.success && gitResult.result.trim()) {
            if (options.force) {
                log.warning('Uncommitted changes detected but --force flag specified, continuing...');
            } else {
                log.error('Uncommitted changes detected. Commit changes or use --force flag to continue.');
                process.exit(1);
            }
        } else {
            log.gray('Working directory is clean');
        }
    } catch (gitError) {
        log.gray('Git status check skipped (not a git repository)');
    }
    
    log.success('Pre-flight checks completed');
}

// Check if extension is currently installed
function checkExtensionInstalled(extensionId) {
    try {
        const result = execCommandSafe(`code --list-extensions`, 'Check installed extensions');
        if (result.success) {
            const installedExtensions = result.result.split('\n').map(ext => ext.trim().toLowerCase());
            return installedExtensions.includes(extensionId.toLowerCase());
        }
        return false;
    } catch (error) {
        log.warning(`Could not check installed extensions: ${error.message}`);
        return false;
    }
}

// Uninstall previous version of the extension
function uninstallPreviousVersion(extensionId) {
    try {
        log.step(`Checking for previous installation of ${extensionId}...`);
        
        if (checkExtensionInstalled(extensionId)) {
            log.gray(`Previous installation found, uninstalling...`);
            const uninstallCommand = `code --uninstall-extension ${extensionId}`;
            execCommand(uninstallCommand, 'Extension uninstallation');
            log.success(`Successfully uninstalled previous version of ${extensionId}`);
            
            // Give VS Code a moment to complete the uninstallation
            log.gray('Waiting for uninstallation to complete...');
            const { execSync } = require('child_process');
            // Use a simple sleep command that works cross-platform
            if (process.platform === 'win32') {
                execSync('timeout /t 2 /nobreak', { stdio: 'ignore' });
            } else {
                execSync('sleep 2', { stdio: 'ignore' });
            }
            
            // Verify uninstallation
            if (!checkExtensionInstalled(extensionId)) {
                log.success('Previous version successfully removed');
                return true;
            } else {
                log.warning('Previous version may still be installed');
                return false;
            }
        } else {
            log.gray('No previous installation found');
            return true;
        }
    } catch (error) {
        log.warning(`Error during uninstallation: ${error.message}`);
        log.gray('Continuing with installation - manual uninstall may be required');
        return false;
    }
}

// Main function
async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }
    
    log.header('🚀 Markdown Navigator Extension Builder');
    log.header('=======================================');
    console.log();
    
    // Run pre-flight checks
    await runPreflightChecks(options);
    console.log();

    let installResult = { success: false };
    
    try {
        // Read current version from package.json
        const packageJsonPath = path.join(__dirname, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const currentVersion = packageJson.version;
        const extensionId = `${packageJson.publisher}.${packageJson.name}`;
        
        log.step(`Current version: ${currentVersion}`);
        log.step(`Extension ID: ${extensionId}`);
        
        // Calculate new version
        const newVersion = incrementVersion(currentVersion, options.versionType);
        log.step(`New version will be: ${newVersion}`);
        
        if (options.dryRun) {
            log.info('DRY RUN MODE - No changes will be made');
            log.gray(`Would increment version from ${currentVersion} to ${newVersion}`);
            log.gray(`Would check for and uninstall previous version of ${extensionId}`);
            log.gray(`Would package extension to dist/ directory`);
            if (!options.skipInstall) {
                log.gray(`Would install extension in VS Code`);
            }
            if (!options.skipTest) {
                log.gray(`Would open extension development host`);
            }
            return;
        }
        
        // Move previous versions to snapshot before building new one
        movePreviousVersionToSnapshot(newVersion);
        
        // Update version in package.json
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        log.success(`Updated package.json version to ${newVersion}`);
        
        // Ensure dist directory exists
        const distDir = path.join(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
            log.gray('Created dist directory');
        }
        
        // Package the extension
        log.step('Packaging extension...');
        const packageCommand = `npx vsce package --allow-star-activation --out dist/`;
        execCommand(packageCommand, 'Extension packaging');
        
        // Find the created VSIX file
        const vsixFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.vsix'));
        if (vsixFiles.length === 0) {
            throw new Error('No VSIX file found after packaging');
        }
        
        const vsixFile = vsixFiles[0];
        const vsixPath = path.join(distDir, vsixFile);
        const stats = fs.statSync(vsixPath);
        const fileSizeKB = Math.round(stats.size / 1024);
        
        log.success(`Extension packaged successfully: ${vsixFile} (${fileSizeKB} KB)`);
        
        // Install the extension if not skipped
        if (!options.skipInstall) {
            // First, uninstall any previous version
            const uninstallSuccess = uninstallPreviousVersion(extensionId);
            
            log.step('Installing extension...');
            try {
                const installCommand = `code --install-extension "${vsixPath}" --force`;
                execCommand(installCommand, 'Extension installation');
                log.success('Extension installed successfully');
                installResult.success = true;
                
                // Verify installation
                log.gray('Verifying installation...');
                setTimeout(() => {
                    if (checkExtensionInstalled(extensionId)) {
                        log.success(`✓ Installation verified: ${extensionId} is now installed`);
                    } else {
                        log.warning(`⚠ Installation verification failed: ${extensionId} not found in extension list`);
                        log.gray('Extension may need time to initialize or VS Code may need to be restarted');
                    }
                }, 2000);
                
            } catch (installError) {
                log.warning('Extension installation failed - VS Code CLI may not be available');
                log.gray(`Manual installation: code --install-extension "${vsixPath}" --force`);
                if (uninstallSuccess) {
                    log.gray(`Manual uninstall first: code --uninstall-extension ${extensionId}`);
                }
                installResult.success = false;
            }
        } else {
            log.gray('Skipping extension installation');
        }
        
        // Open extension host for testing if not skipped
        if (!options.skipTest) {
            log.step('Opening extension development host...');
            try {
                await openExtensionHost();
                log.success('Extension development host opened');
            } catch (hostError) {
                log.warning('Could not open extension development host automatically');
                log.gray(`Manual command: code --extensionDevelopmentPath="${__dirname}" "${__dirname}"`);
            }
        } else {
            log.gray('Skipping extension host launch');
        }
        
        // Final summary
        console.log();
        log.header('✅ Build Summary');
        log.success(`Version: ${currentVersion} → ${newVersion}`);
        log.success(`Extension ID: ${extensionId}`);
        log.success(`Package: ${vsixFile} (${fileSizeKB} KB)`);
        if (!options.skipInstall) {
            if (installResult.success) {
                log.success('Installation: Completed successfully (with previous version cleanup)');
            } else {
                log.warning('Installation: Manual installation required');
                log.gray(`Uninstall previous: code --uninstall-extension ${extensionId}`);
                log.gray(`Install new: code --install-extension "${vsixPath}" --force`);
            }
        }
        if (!options.skipTest) {
            log.success('Development host: Launched for testing');
        }
        
        log.header('🎉 Build completed successfully!');
        
    } catch (error) {
        log.error(`Build failed: ${error.message}`);
        if (error.stdout) log.gray(error.stdout);
        if (error.stderr) log.gray(error.stderr);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main, incrementVersion, parseArgs };
