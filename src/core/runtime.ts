import * as vscode from 'vscode';
import {
    activate as activateAppRuntime,
    deactivate as deactivateAppRuntime
} from './app-runtime';

export function activateRuntime(context: vscode.ExtensionContext): void {
    if (typeof activateAppRuntime !== 'function') {
        throw new Error('TypeScript runtime did not expose activate() during cutover');
    }

    activateAppRuntime(context);
}

export function deactivateRuntime(): void {
    if (typeof deactivateAppRuntime === 'function') {
        deactivateAppRuntime();
    }
}