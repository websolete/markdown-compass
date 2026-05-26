import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const MARKDOWN_EXTENSIONS = new Set([
    '.markdown',
    '.md',
    '.mdown',
    '.mkd',
    '.mkdn',
    '.mdtxt',
    '.mdtext'
]);

const BROKEN_LINK_CLASSIFICATIONS = new Set<MarkdownPreviewLinkClassification>([
    'broken-file-link',
    'broken-markdown-fragment-link'
]);

const headingAnchorCache = new Map<string, CachedHeadingAnchorSet>();

export type MarkdownPreviewLinkClassification =
    | 'external'
    | 'anchor-only'
    | 'valid-local-file-link'
    | 'broken-file-link'
    | 'valid-markdown-fragment-link'
    | 'broken-markdown-fragment-link'
    | 'unsupported';

export interface MarkdownPreviewLinkValidationResult {
    classification: MarkdownPreviewLinkClassification;
    href: string;
    shouldSuppress: boolean;
    reason?: string;
    targetUri?: vscode.Uri;
}

interface CachedHeadingAnchorSet {
    mtimeMs: number;
    size: number;
    anchors: Set<string>;
}

interface SplitHrefParts {
    pathPart: string;
    fragment?: string;
}

export function validateMarkdownPreviewLink(
    href: string,
    currentDocument?: vscode.Uri
): MarkdownPreviewLinkValidationResult {
    const trimmedHref = href.trim();

    if (!trimmedHref) {
        return createResult('unsupported', href, undefined, 'empty-href');
    }

    if (isExternalHref(trimmedHref)) {
        return createResult('external', href);
    }

    if (trimmedHref.startsWith('#')) {
        return createResult('anchor-only', href);
    }

    const documentUri = normalizeDocumentUri(currentDocument);
    if (!documentUri || documentUri.scheme !== 'file') {
        return createResult('unsupported', href, undefined, 'missing-current-document');
    }

    const { pathPart, fragment } = splitHref(trimmedHref);
    const targetUri = resolveLocalTarget(pathPart, documentUri);
    if (!targetUri || targetUri.scheme !== 'file') {
        return createResult('unsupported', href, undefined, 'unresolved-target');
    }

    const targetStat = safeStat(targetUri.fsPath);
    if (!targetStat || !targetStat.isFile()) {
        return createResult('broken-file-link', href, targetUri, 'target-not-found');
    }

    if (typeof fragment === 'undefined' || fragment.length === 0) {
        return createResult('valid-local-file-link', href, targetUri);
    }

    if (!isMarkdownPath(targetUri.fsPath)) {
        return createResult('unsupported', href, targetUri, 'unvalidatable-non-markdown-fragment');
    }

    const normalizedFragment = normalizeFragment(fragment);
    if (typeof normalizedFragment === 'undefined') {
        return createResult('unsupported', href, targetUri, 'malformed-fragment');
    }

    if (!normalizedFragment) {
        return createResult('valid-local-file-link', href, targetUri);
    }

    const anchors = getMarkdownHeadingAnchors(targetUri.fsPath, targetStat);
    if (anchors.has(normalizedFragment)) {
        return createResult('valid-markdown-fragment-link', href, targetUri);
    }

    return createResult('broken-markdown-fragment-link', href, targetUri, 'fragment-not-found');
}

export function clearMarkdownPreviewLinkValidatorCache(): void {
    headingAnchorCache.clear();
}

function createResult(
    classification: MarkdownPreviewLinkClassification,
    href: string,
    targetUri?: vscode.Uri,
    reason?: string
): MarkdownPreviewLinkValidationResult {
    return {
        classification,
        href,
        shouldSuppress: BROKEN_LINK_CLASSIFICATIONS.has(classification),
        reason,
        targetUri
    };
}

function isExternalHref(href: string): boolean {
    if (href.startsWith('//')) {
        return true;
    }

    const schemeMatch = /^[a-z][a-z0-9+.-]*:/i.exec(href);
    if (!schemeMatch) {
        return false;
    }

    return schemeMatch[0].toLowerCase() !== 'file:';
}

function splitHref(href: string): SplitHrefParts {
    const fragmentIndex = href.indexOf('#');
    if (fragmentIndex < 0) {
        return { pathPart: href };
    }

    return {
        pathPart: href.slice(0, fragmentIndex),
        fragment: href.slice(fragmentIndex + 1)
    };
}

function resolveLocalTarget(pathPart: string, currentDocument: vscode.Uri): vscode.Uri | undefined {
    if (!pathPart) {
        return currentDocument;
    }

    if (/^file:/i.test(pathPart)) {
        return safeParseFileUri(pathPart);
    }

    const decodedPath = safeDecodeUriComponent(pathPart);
    if (typeof decodedPath === 'undefined') {
        return undefined;
    }

    if (path.isAbsolute(decodedPath)) {
        return vscode.Uri.file(path.normalize(decodedPath));
    }

    const documentDirectory = path.dirname(currentDocument.fsPath);
    return vscode.Uri.file(path.resolve(documentDirectory, decodedPath));
}

function safeParseFileUri(value: string): vscode.Uri | undefined {
    try {
        const uri = vscode.Uri.parse(value, true);
        return uri.scheme === 'file' ? uri : undefined;
    } catch {
        return undefined;
    }
}

function safeDecodeUriComponent(value: string): string | undefined {
    try {
        return decodeURIComponent(value);
    } catch {
        return undefined;
    }
}

function normalizeDocumentUri(currentDocument?: vscode.Uri): vscode.Uri | undefined {
    if (!currentDocument) {
        return undefined;
    }

    return currentDocument;
}

function safeStat(filePath: string): fs.Stats | undefined {
    try {
        return fs.statSync(filePath);
    } catch {
        return undefined;
    }
}

function isMarkdownPath(filePath: string): boolean {
    return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function normalizeFragment(fragment: string): string | undefined {
    const decodedFragment = safeDecodeUriComponent(fragment);
    if (typeof decodedFragment === 'undefined') {
        return undefined;
    }

    return decodedFragment.trim().toLowerCase();
}

function getMarkdownHeadingAnchors(filePath: string, targetStat: fs.Stats): Set<string> {
    const cached = headingAnchorCache.get(filePath);
    if (cached && cached.mtimeMs === targetStat.mtimeMs && cached.size === targetStat.size) {
        return cached.anchors;
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const anchors = parseMarkdownHeadingAnchors(fileContents);
    headingAnchorCache.set(filePath, {
        mtimeMs: targetStat.mtimeMs,
        size: targetStat.size,
        anchors
    });
    return anchors;
}

function parseMarkdownHeadingAnchors(fileContents: string): Set<string> {
    const anchors = new Set<string>();
    const slugCounts = new Map<string, number>();
    const lines = fileContents.replace(/\r\n?/g, '\n').split('\n');
    let fencedBlockMarker: string | undefined;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];

        const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
        if (fenceMatch) {
            if (!fencedBlockMarker) {
                fencedBlockMarker = fenceMatch[1][0].repeat(fenceMatch[1].length);
            } else if (fenceMatch[1][0] === fencedBlockMarker[0] && fenceMatch[1].length >= fencedBlockMarker.length) {
                fencedBlockMarker = undefined;
            }
            continue;
        }

        if (fencedBlockMarker) {
            continue;
        }

        const atxHeadingText = extractAtxHeadingText(line);
        if (typeof atxHeadingText === 'string') {
            addHeadingAnchor(anchors, slugCounts, atxHeadingText);
            continue;
        }

        const nextLine = lines[lineIndex + 1];
        if (typeof nextLine === 'string' && /^\s{0,3}(=+|-+)\s*$/.test(nextLine) && line.trim()) {
            addHeadingAnchor(anchors, slugCounts, line);
            lineIndex += 1;
        }
    }

    return anchors;
}

function extractAtxHeadingText(line: string): string | undefined {
    const match = /^\s{0,3}(#{1,6})(?!#)(?:[ \t]+|$)(.*?)(?:[ \t]+#+\s*)?$/.exec(line);
    return match ? match[2] : undefined;
}

function addHeadingAnchor(anchors: Set<string>, slugCounts: Map<string, number>, rawHeadingText: string): void {
    const anchor = createVSCodeCompatibleAnchor(rawHeadingText);
    if (!anchor) {
        return;
    }

    const existingCount = slugCounts.get(anchor) ?? 0;
    slugCounts.set(anchor, existingCount + 1);
    anchors.add(existingCount === 0 ? anchor : `${anchor}-${existingCount}`);
}

function createVSCodeCompatibleAnchor(rawHeadingText: string): string {
    return normalizeHeadingText(rawHeadingText)
        .trim()
        .toLowerCase()
        .replace(/[^\0-\u007F]+/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeHeadingText(rawHeadingText: string): string {
    return decodeBasicEntities(
        rawHeadingText
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, '$1')
            .replace(/[*_~]/g, '')
    );
}

function decodeBasicEntities(value: string): string {
    return value
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}