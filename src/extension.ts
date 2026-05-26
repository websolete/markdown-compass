import * as vscode from 'vscode';
import { deactivateRuntime, activateRuntime } from './core/runtime';
import {
    type MarkdownItLike,
  extendMarkdownItWithSafeLinkSuppression,
  getSafePreviewRenderDebugState,
  resetSafePreviewRenderDebugState
} from './services/markdown-safe-preview-plugin';
import { validateMarkdownPreviewLink } from './services/markdown-preview-link-validator';

export interface MarkdownCompassExports {
  extendMarkdownIt: (markdownIt: MarkdownItLike) => MarkdownItLike;
  __test: {
    extendMarkdownItWithSafeLinkSuppression: typeof extendMarkdownItWithSafeLinkSuppression;
    getSafePreviewRenderDebugState: typeof getSafePreviewRenderDebugState;
    resetSafePreviewRenderDebugState: typeof resetSafePreviewRenderDebugState;
    validateMarkdownPreviewLink: typeof validateMarkdownPreviewLink;
  };
}

/**
 * Activate the extension through the TypeScript runtime entry.
 */
export function activate(context: vscode.ExtensionContext): MarkdownCompassExports {
  activateRuntime(context);

  return {
    extendMarkdownIt: extendMarkdownItWithSafeLinkSuppression,
    __test: {
      extendMarkdownItWithSafeLinkSuppression,
      getSafePreviewRenderDebugState,
      resetSafePreviewRenderDebugState,
      validateMarkdownPreviewLink
    }
  };
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  deactivateRuntime();
}
