/**
 * Test script to see if VS Code WebviewPanel.iconPath supports light/dark variants
 * This is useful for ensuring icons are visible in both light and dark themes
 */

const vscode = require('vscode');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Icon variant test extension is now active');

    let disposable = vscode.commands.registerCommand('testIconVariants.showPanel', function () {
        // Create a new panel
        const panel = vscode.window.createWebviewPanel(
            'iconVariantTest',
            'Icon Variant Test',
            vscode.ViewColumn.One,
            {}
        );

        // Using both light and dark variants for the icon
        panel.iconPath = {
            light: vscode.Uri.file(path.join(__dirname, 'icon.png')),
            dark: vscode.Uri.file(path.join(__dirname, 'icon.png'))
        };

        console.log('Panel created with light/dark variant icons');

        // Show a message in the panel
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Icon Variant Test</title>
            </head>
            <body>
                <h1>Icon Variant Test</h1>
                <p>This panel is using a light/dark variant for its icon.</p>
                <p>Check the tab icon in both light and dark themes.</p>
            </body>
            </html>
        `;
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};