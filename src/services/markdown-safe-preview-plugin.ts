import * as vscode from 'vscode';
import {
    type MarkdownPreviewLinkValidationResult,
    validateMarkdownPreviewLink
} from './markdown-preview-link-validator';

type MarkdownItRendererRule = (
    tokens: MarkdownItToken[],
    idx: number,
    options: unknown,
    env: unknown,
    self: MarkdownItRenderer
) => string;

type MarkdownItToken = {
    attrs?: Array<[string, string]>;
    meta?: Record<string, unknown>;
    tag: string;
    attrGet(name: string): string | null;
    attrJoin(name: string, value: string): void;
    attrSet(name: string, value: string): void;
};

type MarkdownItRenderer = {
    render?(tokens: MarkdownItToken[], options: unknown, env: unknown): string;
    renderToken(tokens: MarkdownItToken[], idx: number, options: unknown): string;
};

type MarkdownItRendererHost = {
    render?(tokens: MarkdownItToken[], options: unknown, env: unknown): string;
    rules: Record<string, MarkdownItRendererRule | undefined>;
};

export type MarkdownItLike = {
    renderer: MarkdownItRendererHost;
};

export interface SafePreviewRenderDebugState {
    renderCount: number;
    lastHref?: string;
    lastCurrentDocumentKind?: string;
    lastCurrentDocumentKeys?: string[];
    lastCurrentDocumentValue?: string;
    lastNormalizedDocumentUri?: string;
    lastValidationClassification?: string;
    lastValidationReason?: string;
    lastShouldSuppress?: boolean;
}

interface MarkdownPreviewRenderEnv {
    currentDocument?: unknown;
    __markdownCompassSafeLinkStack?: boolean[];
}

const safePreviewRenderDebugState: SafePreviewRenderDebugState = {
    renderCount: 0
};

export function extendMarkdownItWithSafeLinkSuppression(markdownIt: MarkdownItLike): MarkdownItLike {
    const originalRender = typeof markdownIt.renderer.render === 'function'
        ? markdownIt.renderer.render.bind(markdownIt.renderer)
        : undefined;
    const originalLinkOpen = markdownIt.renderer.rules.link_open;
    const originalLinkClose = markdownIt.renderer.rules.link_close;

    if (originalRender) {
        markdownIt.renderer.render = (tokens: MarkdownItToken[], options: unknown, env: unknown) => {
            const currentDocument = getCurrentDocumentFromMarkdownEnv(env);
            recordSafePreviewRenderDebugState(
                null,
                (env as MarkdownPreviewRenderEnv | undefined)?.currentDocument,
                currentDocument,
                undefined,
                false
            );

            return originalRender(tokens, options, env);
        };
    }

    markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const currentDocument = getCurrentDocumentFromMarkdownEnv(env);
        const href = token.attrGet('href');
        const isEnabled = isSafeLinkSuppressionEnabled(currentDocument);
        const validation = typeof href === 'string'
            ? validateMarkdownPreviewLink(href, currentDocument)
            : undefined;
        const shouldSuppress = !!validation && isEnabled && validation.shouldSuppress;

        recordSafePreviewRenderDebugState(href, (env as MarkdownPreviewRenderEnv | undefined)?.currentDocument, currentDocument, validation, shouldSuppress);

        getSuppressionStack(env)?.push(shouldSuppress);

        if (!shouldSuppress || !validation) {
            return renderRule(originalLinkOpen, tokens, idx, options, env, self);
        }

        suppressLinkOpenToken(token, validation);
        return self.renderToken(tokens, idx, options);
    };

    markdownIt.renderer.rules.link_close = (tokens, idx, options, env, self) => {
        const shouldSuppress = getSuppressionStack(env)?.pop() ?? false;
        if (!shouldSuppress) {
            return renderRule(originalLinkClose, tokens, idx, options, env, self);
        }

        tokens[idx].tag = 'span';
        return self.renderToken(tokens, idx, options);
    };

    return markdownIt;
}

export function getCurrentDocumentFromMarkdownEnv(env: unknown): vscode.Uri | undefined {
    if (!env || typeof env !== 'object') {
        return undefined;
    }

    return normalizeUri((env as MarkdownPreviewRenderEnv).currentDocument);
}

export function getSafePreviewRenderDebugState(): SafePreviewRenderDebugState {
    return {
        ...safePreviewRenderDebugState,
        lastCurrentDocumentKeys: safePreviewRenderDebugState.lastCurrentDocumentKeys
            ? [...safePreviewRenderDebugState.lastCurrentDocumentKeys]
            : undefined
    };
}

export function resetSafePreviewRenderDebugState(): void {
    safePreviewRenderDebugState.renderCount = 0;
    delete safePreviewRenderDebugState.lastHref;
    delete safePreviewRenderDebugState.lastCurrentDocumentKind;
    delete safePreviewRenderDebugState.lastCurrentDocumentKeys;
    delete safePreviewRenderDebugState.lastCurrentDocumentValue;
    delete safePreviewRenderDebugState.lastNormalizedDocumentUri;
    delete safePreviewRenderDebugState.lastValidationClassification;
    delete safePreviewRenderDebugState.lastValidationReason;
    delete safePreviewRenderDebugState.lastShouldSuppress;
}

function renderRule(
    rule: MarkdownItRendererRule | undefined,
    tokens: MarkdownItToken[],
    idx: number,
    options: unknown,
    env: unknown,
    self: MarkdownItRenderer
): string {
    return rule ? rule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
}

function recordSafePreviewRenderDebugState(
    href: string | null,
    rawCurrentDocument: unknown,
    normalizedCurrentDocument: vscode.Uri | undefined,
    validation: MarkdownPreviewLinkValidationResult | undefined,
    shouldSuppress: boolean
): void {
    safePreviewRenderDebugState.renderCount += 1;
    safePreviewRenderDebugState.lastHref = typeof href === 'string' ? href : undefined;
    safePreviewRenderDebugState.lastNormalizedDocumentUri = normalizedCurrentDocument?.toString(true);
    safePreviewRenderDebugState.lastValidationClassification = validation?.classification;
    safePreviewRenderDebugState.lastValidationReason = validation?.reason;
    safePreviewRenderDebugState.lastShouldSuppress = shouldSuppress;

    const currentDocumentSummary = summarizeCurrentDocumentValue(rawCurrentDocument);
    safePreviewRenderDebugState.lastCurrentDocumentKind = currentDocumentSummary.kind;
    safePreviewRenderDebugState.lastCurrentDocumentKeys = currentDocumentSummary.keys;
    safePreviewRenderDebugState.lastCurrentDocumentValue = currentDocumentSummary.value;
}

function summarizeCurrentDocumentValue(value: unknown): { kind: string; keys?: string[]; value?: string } {
    if (value instanceof vscode.Uri) {
        return {
            kind: 'uri',
            value: value.toString(true)
        };
    }

    if (typeof value === 'string') {
        return {
            kind: 'string',
            value
        };
    }

    if (!value || typeof value !== 'object') {
        return {
            kind: typeof value
        };
    }

    const candidate = value as {
        scheme?: unknown;
        path?: unknown;
        toString?: () => string;
    };

    return {
        kind: typeof candidate.scheme === 'string' && typeof candidate.path === 'string'
            ? 'uri-components'
            : 'object',
        keys: Object.keys(value as Record<string, unknown>).sort(),
        value: typeof candidate.toString === 'function' ? safeInvokeToString(candidate.toString) : undefined
    };
}

function safeInvokeToString(toString: () => string): string | undefined {
    try {
        return toString.call(undefined);
    } catch {
        return undefined;
    }
}

function getSuppressionStack(env: unknown): boolean[] | undefined {
    if (!env || typeof env !== 'object') {
        return undefined;
    }

    const renderEnv = env as MarkdownPreviewRenderEnv;
    if (!Array.isArray(renderEnv.__markdownCompassSafeLinkStack)) {
        renderEnv.__markdownCompassSafeLinkStack = [];
    }

    return renderEnv.__markdownCompassSafeLinkStack;
}

function normalizeUri(value: unknown): vscode.Uri | undefined {
    if (value instanceof vscode.Uri) {
        return value;
    }

    if (typeof value === 'string') {
        return safeParseUri(value);
    }

    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as {
        authority?: unknown;
        fragment?: unknown;
        path?: unknown;
        query?: unknown;
        scheme?: unknown;
        toString?: () => string;
    };

    if (typeof candidate.scheme === 'string' && typeof candidate.path === 'string') {
        return safeCreateUriFromComponents({
            scheme: candidate.scheme,
            path: candidate.path,
            authority: candidate.authority,
            query: candidate.query,
            fragment: candidate.fragment
        });
    }

    if (typeof candidate.toString === 'function') {
        return safeParseUri(candidate.toString());
    }

    return undefined;
}

function safeParseUri(value: string): vscode.Uri | undefined {
    try {
        return vscode.Uri.parse(value, true);
    } catch {
        return undefined;
    }
}

function safeCreateUriFromComponents(components: {
    authority?: unknown;
    fragment?: unknown;
    path: string;
    query?: unknown;
    scheme: string;
}): vscode.Uri | undefined {
    try {
        return vscode.Uri.from({
            scheme: components.scheme,
            path: components.path,
            authority: typeof components.authority === 'string' ? components.authority : '',
            query: typeof components.query === 'string' ? components.query : '',
            fragment: typeof components.fragment === 'string' ? components.fragment : ''
        });
    } catch {
        return undefined;
    }
}

function isSafeLinkSuppressionEnabled(currentDocument?: vscode.Uri): boolean {
    // This hook applies to all native markdown previews while the extension is active.
    return vscode.workspace
        .getConfiguration('markdownCompass', currentDocument ?? null)
        .get<boolean>('safeLinkSuppression.enabled', true);
}

function suppressLinkOpenToken(token: MarkdownItToken, validation: MarkdownPreviewLinkValidationResult): void {
    token.tag = 'span';
    token.meta = {
        ...token.meta,
        markdownCompassSafeLink: validation
    };

    stripInteractiveLinkAttributes(token);
    token.attrJoin('class', 'markdown-compass-broken-link');
    token.attrSet('title', buildSuppressionTitle(validation));
    token.attrSet('aria-disabled', 'true');
    token.attrSet('data-markdown-compass-safe-link', validation.classification);
}

function stripInteractiveLinkAttributes(token: MarkdownItToken): void {
    if (!Array.isArray(token.attrs) || token.attrs.length === 0) {
        return;
    }

    token.attrs = token.attrs.filter(([name]) => !isInteractiveLinkAttribute(name));
}

function isInteractiveLinkAttribute(name: string): boolean {
    return name === 'href'
        || name === 'data-href'
        || name === 'download'
        || name === 'rel'
        || name === 'target';
}

function buildSuppressionTitle(validation: MarkdownPreviewLinkValidationResult): string {
    switch (validation.classification) {
        case 'broken-file-link':
            return 'Broken local link: target file not found';
        case 'broken-markdown-fragment-link':
            return 'Broken local link: heading fragment not found';
        default:
            return 'Broken local link';
    }
}