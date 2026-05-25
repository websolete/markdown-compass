import * as vscode from 'vscode';

type RuntimeModule = {
    activate?: (context: vscode.ExtensionContext) => void;
    deactivate?: () => void;
};

const runtime = require('./app-runtime') as RuntimeModule;

export function activateRuntime(context: vscode.ExtensionContext): void {
    if (typeof runtime.activate !== 'function') {
        throw new Error('TypeScript runtime did not expose activate() during cutover');
    }

    runtime.activate(context);
}

export function deactivateRuntime(): void {
    if (typeof runtime.deactivate === 'function') {
        runtime.deactivate();
    }
}