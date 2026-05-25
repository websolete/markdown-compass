import * as vscode from 'vscode';
import { deactivateRuntime, activateRuntime } from './core/runtime';

/**
 * Activate the extension through the TypeScript runtime entry.
 */
export function activate(context: vscode.ExtensionContext): void {
  activateRuntime(context);
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  deactivateRuntime();
}
