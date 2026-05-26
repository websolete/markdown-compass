const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

const MarkdownItModule = require('markdown-it');
const MarkdownIt = MarkdownItModule.default ?? MarkdownItModule;
const SafePreviewPluginModule = require('../dist/markdown-safe-preview-plugin');
const LinkValidatorModule = require('../dist/markdown-preview-link-validator');
const packageJson = require('../package.json');

const extendMarkdownItWithSafeLinkSuppression =
    SafePreviewPluginModule.extendMarkdownItWithSafeLinkSuppression
    ?? SafePreviewPluginModule.default
    ?? SafePreviewPluginModule;

const validateMarkdownPreviewLink =
    LinkValidatorModule.validateMarkdownPreviewLink
    ?? LinkValidatorModule.default
    ?? LinkValidatorModule;

const clearMarkdownPreviewLinkValidatorCache =
    LinkValidatorModule.clearMarkdownPreviewLinkValidatorCache
    ?? (() => {});

const EXTENSION_LOOKUP_IDS = [
    `${packageJson.publisher}.${packageJson.name}`,
    `${String(packageJson.publisher).toLowerCase()}.${packageJson.name}`
];

function getExtension() {
    for (const extensionId of EXTENSION_LOOKUP_IDS) {
        const extension = vscode.extensions.getExtension(extensionId);
        if (extension) {
            return extension;
        }
    }

    assert.fail(`Extension should be installed under one of: ${EXTENSION_LOOKUP_IDS.join(', ')}`);
}

async function waitFor(resolveValue, options = {}) {
    const timeoutMs = options.timeoutMs ?? 5000;
    const intervalMs = options.intervalMs ?? 100;
    const description = options.description ?? 'condition';
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const value = await resolveValue();
        if (value) {
            return value;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for ${description}`);
}

async function createFixtureSet() {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-navigator-safe-links-'));
    const sourcePath = path.join(fixtureRoot, 'source.md');
    const targetPath = path.join(fixtureRoot, 'target.md');
    const binaryPlaceholderPath = path.join(fixtureRoot, 'diagram.png');

    await fs.writeFile(
        targetPath,
        [
            '# Target Document',
            '',
            '## Purpose',
            '',
            '## Purpose',
            '',
            '### Case & Study',
            '',
            'Cross-file fragment targets.'
        ].join('\n'),
        'utf8'
    );

    await fs.writeFile(
        sourcePath,
        [
            '# Source Document',
            '',
            'Preview source for safe link suppression tests.'
        ].join('\n'),
        'utf8'
    );

    await fs.writeFile(binaryPlaceholderPath, 'placeholder', 'utf8');

    return {
        fixtureRoot,
        sourceUri: vscode.Uri.file(sourcePath),
        targetUri: vscode.Uri.file(targetPath),
        binaryPlaceholderUri: vscode.Uri.file(binaryPlaceholderPath)
    };
}

async function createNestedRelativeResolutionFixtureSet() {
    const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-navigator-relative-base-'));
    const planningDirectory = path.join(fixtureRoot, '.copirate', 'working', 'planning');
    const researchDirectory = path.join(fixtureRoot, '.copirate', 'working', 'research');
    const commandsDirectory = path.join(fixtureRoot, 'src', 'commands');
    const trackerPath = path.join(planningDirectory, 'CID_COVERAGE_REPORT_WORK_TRACKER.md');
    const planPath = path.join(planningDirectory, 'CID_COVERAGE_REPORT_ENHANCEMENT_PLAN.md');
    const quickReferencePath = path.join(researchDirectory, 'CID_COVERAGE_REPORT_QUICK_REFERENCE.md');
    const commandPath = path.join(commandsDirectory, 'GenerateCIDCoverageReportCommand.ts');

    await fs.mkdir(planningDirectory, { recursive: true });
    await fs.mkdir(researchDirectory, { recursive: true });
    await fs.mkdir(commandsDirectory, { recursive: true });

    await fs.writeFile(
        trackerPath,
        [
            '# CID Coverage Report Enhancement - Work Tracker',
            '',
            '- [Enhancement Plan](./CID_COVERAGE_REPORT_ENHANCEMENT_PLAN.md)',
            '- [Quick Reference](../research/CID_COVERAGE_REPORT_QUICK_REFERENCE.md)',
            '- [Current Implementation](../../../src/commands/GenerateCIDCoverageReportCommand.ts)'
        ].join('\n'),
        'utf8'
    );

    await fs.writeFile(planPath, '# Enhancement Plan\n', 'utf8');
    await fs.writeFile(quickReferencePath, '# Quick Reference\n', 'utf8');
    await fs.writeFile(commandPath, 'export class GenerateCIDCoverageReportCommand {}\n', 'utf8');

    return {
        fixtureRoot,
        trackerUri: vscode.Uri.file(trackerPath),
        planUri: vscode.Uri.file(planPath),
        quickReferenceUri: vscode.Uri.file(quickReferencePath),
        commandUri: vscode.Uri.file(commandPath)
    };
}

async function disposeFixtureSet(fixtures) {
    clearMarkdownPreviewLinkValidatorCache();

    if (fixtures?.fixtureRoot) {
        await fs.rm(fixtures.fixtureRoot, { recursive: true, force: true });
    }
}

async function withConfigurationValues(updates, callback) {
    const configuration = vscode.workspace.getConfiguration();
    const originals = new Map();

    for (const [key, value] of Object.entries(updates)) {
        originals.set(key, configuration.get(key));
        await configuration.update(key, value, vscode.ConfigurationTarget.Global);
    }

    try {
        return await callback();
    } finally {
        for (const [key, value] of originals.entries()) {
            await configuration.update(key, value, vscode.ConfigurationTarget.Global);
        }
    }
}

async function getActivatedExtensionExports() {
    const extension = getExtension();
    if (!extension.isActive) {
        await extension.activate();
    }

    return extension.exports;
}

function renderMarkdown(markdownSource, currentDocument) {
    const markdownIt = extendMarkdownItWithSafeLinkSuppression(new MarkdownIt());
    const env = currentDocument ? { currentDocument } : {};
    return markdownIt.render(markdownSource, env);
}

describe('Markdown Safe Preview Plugin', function() {
    this.timeout(30000);

    before(async function() {
        const extension = getExtension();
        if (!extension.isActive) {
            await extension.activate();
        }
    });

    it('declares the native markdown preview hook and exposes compiled safe-link modules', async function() {
        const extension = getExtension();
        const contributes = extension.packageJSON.contributes ?? {};
        const configuration = contributes.configuration?.properties ?? {};

        assert.strictEqual(contributes['markdown.markdownItPlugins'], true, 'package.json should contribute markdownItPlugins');
        assert.ok(
            Array.isArray(contributes['markdown.previewStyles'])
            && contributes['markdown.previewStyles'].includes('./styles/markdown-safe-links.css'),
            'package.json should contribute the safe-link preview stylesheet'
        );
        assert.strictEqual(
            configuration['markdownNavigator.safeLinkSuppression.enabled']?.default,
            true,
            'package.json should default safe link suppression to enabled'
        );

        assert.strictEqual(typeof extendMarkdownItWithSafeLinkSuppression, 'function', 'Compiled plugin entrypoint should be available for focused tests');
        assert.strictEqual(typeof validateMarkdownPreviewLink, 'function', 'Compiled validator entrypoint should be available for focused tests');
    });

    it('classifies local markdown links deterministically', async function() {
        const fixtures = await createFixtureSet();

        try {
            assert.strictEqual(
                validateMarkdownPreviewLink('https://example.com/docs', fixtures.sourceUri).classification,
                'external'
            );
            assert.strictEqual(
                validateMarkdownPreviewLink('#local-anchor', fixtures.sourceUri).classification,
                'anchor-only'
            );

            const validFileLink = validateMarkdownPreviewLink('./target.md', fixtures.sourceUri);
            assert.strictEqual(validFileLink.classification, 'valid-local-file-link');
            assert.strictEqual(validFileLink.shouldSuppress, false);

            const validAbsoluteFileLink = validateMarkdownPreviewLink(fixtures.targetUri.toString(), fixtures.sourceUri);
            assert.strictEqual(validAbsoluteFileLink.classification, 'valid-local-file-link');

            const brokenFileLink = validateMarkdownPreviewLink('./missing.md', fixtures.sourceUri);
            assert.strictEqual(brokenFileLink.classification, 'broken-file-link');
            assert.strictEqual(brokenFileLink.shouldSuppress, true);

            const validFragmentLink = validateMarkdownPreviewLink('./target.md#purpose', fixtures.sourceUri);
            assert.strictEqual(validFragmentLink.classification, 'valid-markdown-fragment-link');
            assert.strictEqual(validFragmentLink.shouldSuppress, false);

            const duplicateHeadingFragmentLink = validateMarkdownPreviewLink('./target.md#purpose-1', fixtures.sourceUri);
            assert.strictEqual(duplicateHeadingFragmentLink.classification, 'valid-markdown-fragment-link');

            const brokenFragmentLink = validateMarkdownPreviewLink('./target.md#missing-heading', fixtures.sourceUri);
            assert.strictEqual(brokenFragmentLink.classification, 'broken-markdown-fragment-link');
            assert.strictEqual(brokenFragmentLink.shouldSuppress, true);

            const unsupportedNonMarkdownFragment = validateMarkdownPreviewLink('./diagram.png#region', fixtures.sourceUri);
            assert.strictEqual(unsupportedNonMarkdownFragment.classification, 'unsupported');
            assert.strictEqual(unsupportedNonMarkdownFragment.shouldSuppress, false);
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('resolves relative links from the current document physical directory without parent-directory drift', async function() {
        const fixtures = await createNestedRelativeResolutionFixtureSet();

        try {
            const planResult = validateMarkdownPreviewLink('./CID_COVERAGE_REPORT_ENHANCEMENT_PLAN.md', fixtures.trackerUri);
            assert.strictEqual(planResult.classification, 'valid-local-file-link');
            assert.strictEqual(planResult.targetUri?.fsPath.toLowerCase(), fixtures.planUri.fsPath.toLowerCase());

            const quickReferenceResult = validateMarkdownPreviewLink('../research/CID_COVERAGE_REPORT_QUICK_REFERENCE.md', fixtures.trackerUri);
            assert.strictEqual(quickReferenceResult.classification, 'valid-local-file-link');
            assert.strictEqual(quickReferenceResult.targetUri?.fsPath.toLowerCase(), fixtures.quickReferenceUri.fsPath.toLowerCase());

            const commandResult = validateMarkdownPreviewLink('../../../src/commands/GenerateCIDCoverageReportCommand.ts', fixtures.trackerUri);
            assert.strictEqual(commandResult.classification, 'valid-local-file-link');
            assert.strictEqual(commandResult.targetUri?.fsPath.toLowerCase(), fixtures.commandUri.fsPath.toLowerCase());

            const offByOnePlanResult = validateMarkdownPreviewLink('../CID_COVERAGE_REPORT_ENHANCEMENT_PLAN.md', fixtures.trackerUri);
            assert.strictEqual(offByOnePlanResult.classification, 'broken-file-link');

            const offByOneQuickReferenceResult = validateMarkdownPreviewLink('../CID_COVERAGE_REPORT_QUICK_REFERENCE.md', fixtures.trackerUri);
            assert.strictEqual(offByOneQuickReferenceResult.classification, 'broken-file-link');

            const offByOneCommandResult = validateMarkdownPreviewLink('../../src/commands/GenerateCIDCoverageReportCommand.ts', fixtures.trackerUri);
            assert.strictEqual(offByOneCommandResult.classification, 'broken-file-link');
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('renders definitively broken local links as inert spans in native preview HTML', async function() {
        const fixtures = await createFixtureSet();

        try {
            const html = renderMarkdown(
                [
                    '[Good file](./target.md)',
                    '',
                    '[Broken file](./missing.md)',
                    '',
                    '[Good fragment](./target.md#purpose)',
                    '',
                    '[Broken fragment](./target.md#missing-heading)',
                    '',
                    '[Same-file fragment](#local-anchor)'
                ].join('\n'),
                fixtures.sourceUri
            );

            assert.match(html, /<a[^>]+href="\.\/target\.md"[^>]*>Good file<\/a>/);
            assert.match(html, /<a[^>]+href="\.\/target\.md#purpose"[^>]*>Good fragment<\/a>/);
            assert.match(html, /<a[^>]+href="#local-anchor"[^>]*>Same-file fragment<\/a>/);
            assert.match(html, /<span[^>]+class="[^"]*markdown-navigator-broken-link[^"]*"[^>]*>Broken file<\/span>/);
            assert.match(html, /<span[^>]+data-markdown-navigator-safe-link="broken-markdown-fragment-link"[^>]*>Broken fragment<\/span>/);
            assert.ok(!html.includes('href="./missing.md"'), 'Broken file link should not render as a clickable anchor');
            assert.ok(!html.includes('href="./target.md#missing-heading"'), 'Broken fragment link should not render as a clickable anchor');
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('suppresses broken links when the markdown render env passes serialized URI components', async function() {
        const fixtures = await createFixtureSet();

        try {
            const html = renderMarkdown('[Broken file](./missing.md)', fixtures.sourceUri.toJSON());

            assert.match(html, /<span[^>]+class="[^"]*markdown-navigator-broken-link[^"]*"[^>]*>Broken file<\/span>/);
            assert.ok(!html.includes('href="./missing.md"'), 'Broken file link should not remain clickable when currentDocument is serialized Uri components');
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });

    it('is invoked by the live native preview host for broken local links', async function() {
        const fixtures = await createFixtureSet();
        const extensionExports = await getActivatedExtensionExports();

        await fs.writeFile(
            fixtures.sourceUri.fsPath,
            [
                '# Source Document',
                '',
                '[Broken file](./missing.md)',
                '',
                'Preview source for safe link suppression tests.'
            ].join('\n'),
            'utf8'
        );

        extensionExports.__test.resetSafePreviewRenderDebugState();

        try {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await vscode.commands.executeCommand('markdown.showPreview', fixtures.sourceUri);

            const debugState = await waitFor(
                () => {
                    const currentState = extensionExports.__test.getSafePreviewRenderDebugState();
                    return currentState.renderCount > 0 ? currentState : null;
                },
                { description: 'safe preview plugin invocation from the native preview host', timeoutMs: 10000 }
            );

            assert.strictEqual(debugState.lastHref, './missing.md');
            assert.strictEqual(debugState.lastValidationClassification, 'broken-file-link');
            assert.strictEqual(debugState.lastShouldSuppress, true);
            assert.ok(debugState.lastNormalizedDocumentUri?.startsWith('file:'), `Expected normalized current document URI, got ${JSON.stringify(debugState)}`);
        } finally {
            extensionExports.__test.resetSafePreviewRenderDebugState();
            await disposeFixtureSet(fixtures);
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        }
    });

    it('leaves broken links unchanged when suppression is disabled or the render document is unavailable', async function() {
        const fixtures = await createFixtureSet();

        try {
            await withConfigurationValues({
                'markdownNavigator.safeLinkSuppression.enabled': false
            }, async () => {
                const disabledHtml = renderMarkdown('[Broken file](./missing.md)', fixtures.sourceUri);
                assert.match(disabledHtml, /<a[^>]+href="\.\/missing\.md"[^>]*>Broken file<\/a>/);
            });

            const noDocumentHtml = renderMarkdown('[Broken file](./missing.md)');
            assert.match(noDocumentHtml, /<a[^>]+href="\.\/missing\.md"[^>]*>Broken file<\/a>/);
        } finally {
            await disposeFixtureSet(fixtures);
        }
    });
});