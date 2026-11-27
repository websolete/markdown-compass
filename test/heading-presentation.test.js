const assert = require('assert');

const {
    extractMarkdownHeadings,
    formatHeadingLabel,
    resolveHeadingIcon,
    presentHeading,
    stripInlineMarkdown,
    normalizeHeadingEmojiMode,
    normalizeHeadingIconMode
} = require('../dist/heading-presentation');

function iconId(text, level = 2) {
    const icon = resolveHeadingIcon(text, level);
    return icon.kind === 'codicon' ? icon.id : `h${icon.level}`;
}

describe('Heading presentation', function() {
    describe('extractMarkdownHeadings', function() {
        it('ignores heading-like lines inside fenced code blocks', function() {
            const content = [
                '# Title',
                '```bash',
                '# install dependencies',
                'npm install',
                '```',
                '~~~~',
                '## not a heading',
                '```',
                '## still inside the tilde fence',
                '~~~~',
                '## Real Section'
            ].join('\n');

            assert.deepStrictEqual(
                extractMarkdownHeadings(content).map(h => [h.level, h.text, h.line]),
                [[1, 'Title', 1], [2, 'Real Section', 11]]
            );
        });

        it('ignores YAML comments in front matter', function() {
            const content = '---\n# comment\ntitle: Doc\n---\n# Doc Title\r\n';
            assert.deepStrictEqual(
                extractMarkdownHeadings(content).map(h => [h.text, h.line]),
                [['Doc Title', 5]]
            );
        });

        it('treats four-space indented lines as code, not headings', function() {
            assert.deepStrictEqual(extractMarkdownHeadings('    # code\n   # Heading'), [
                { level: 1, text: 'Heading', line: 2 }
            ]);
        });

        it('keeps the raw heading text for anchor navigation', function() {
            const [heading] = extractMarkdownHeadings('## **Bold** `code` [link](x.md)');
            assert.strictEqual(heading.text, '**Bold** `code` [link](x.md)');
        });
    });

    describe('labels', function() {
        it('strips inline Markdown to visible text', function() {
            assert.strictEqual(
                stripInlineMarkdown('**Advanced** options and [links](https://example.com) ##'),
                'Advanced options and links'
            );
            assert.strictEqual(stripInlineMarkdown('`markdownCompass.browseMode`'), 'markdownCompass.browseMode');
            assert.strictEqual(stripInlineMarkdown('The `__init__` hook'), 'The __init__ hook');
            assert.strictEqual(stripInlineMarkdown('snake_case_name stays'), 'snake_case_name stays');
            assert.strictEqual(stripInlineMarkdown('*em* and ~~gone~~ and <kbd>Ctrl</kbd>'), 'em and gone and Ctrl');
        });

        it('strips emoji by default and keeps them on request', function() {
            assert.strictEqual(formatHeadingLabel('🚀 **Launch** Checklist ✅'), 'Launch Checklist');
            assert.strictEqual(formatHeadingLabel('🚀 **Launch** Checklist ✅', 'keep'), '🚀 Launch Checklist ✅');
        });

        it('falls back to the emoji when a heading is nothing but emoji', function() {
            assert.strictEqual(presentHeading('🎉', 2).label, '🎉');
        });

        it('normalizes unknown setting values to strip', function() {
            assert.strictEqual(normalizeHeadingEmojiMode('keep'), 'keep');
            assert.strictEqual(normalizeHeadingEmojiMode('bogus'), 'strip');
            assert.strictEqual(normalizeHeadingEmojiMode(undefined), 'strip');
        });
    });

    describe('icons', function() {
        it('maps common section names to semantic icons', function() {
            assert.strictEqual(iconId('Installation'), 'cloud-download');
            assert.strictEqual(iconId('Configuration'), 'settings-gear');
            assert.strictEqual(iconId('API Reference'), 'symbol-interface');
            assert.strictEqual(iconId('FAQ'), 'question');
            assert.strictEqual(iconId('Known Issues'), 'warning');
            assert.strictEqual(iconId('TODO'), 'tasklist');
            assert.strictEqual(iconId('Changelog'), 'history');
            assert.strictEqual(iconId('License'), 'law');
            assert.strictEqual(iconId('Quick Start'), 'rocket');
            assert.strictEqual(iconId('Prerequisites'), 'checklist');
        });

        it('prefers alerting sections over broad ones', function() {
            assert.strictEqual(iconId('Installation Troubleshooting'), 'tools');
        });

        it('lets the author emoji decide the icon', function() {
            assert.strictEqual(iconId('⚠️ Read this first'), 'warning');
            assert.strictEqual(iconId('🚀 Installation'), 'rocket');
            assert.strictEqual(iconId('Done ✅'), 'pass');
        });

        it('recognizes code-shaped and version headings', function() {
            assert.strictEqual(iconId('getTreeItem()', 4), 'symbol-method');
            assert.strictEqual(iconId('`markdownCompass.browseMode`', 3), 'symbol-key');
            assert.strictEqual(iconId('[1.7.2] - 2026-05-30'), 'tag');
            assert.strictEqual(iconId('v2.0.0'), 'tag');
            assert.strictEqual(iconId('Unreleased'), 'tag');
        });

        it('does not treat ordinary dotted words as code', function() {
            assert.strictEqual(iconId('Node.js', 2), 'h2');
        });

        it('maps Keep a Changelog sections', function() {
            assert.strictEqual(iconId('Added', 3), 'diff-added');
            assert.strictEqual(iconId('Changed', 3), 'diff-modified');
            assert.strictEqual(iconId('Bug Fixes', 3), 'check');
        });

        it('uses a question icon for headings phrased as questions', function() {
            assert.strictEqual(iconId('Why is my tree empty?', 3), 'question');
        });

        it('falls back to a clamped level badge', function() {
            assert.deepStrictEqual(resolveHeadingIcon('Markdown Compass', 1), { kind: 'level', level: 1 });
            assert.deepStrictEqual(resolveHeadingIcon('Deep heading', 6), { kind: 'level', level: 6 });
            assert.deepStrictEqual(resolveHeadingIcon('Odd', 9), { kind: 'level', level: 6 });
        });

        it('shows only level badges in levels mode, and section icons in sections mode', function() {
            assert.deepStrictEqual(presentHeading('⚠️ Installation', 2, 'strip', 'levels').icon, { kind: 'level', level: 2 });
            assert.deepStrictEqual(presentHeading('getTreeItem()', 9, 'strip', 'levels').icon, { kind: 'level', level: 6 });
            assert.strictEqual(presentHeading('Installation', 2, 'strip', 'sections').icon.id, 'cloud-download');
            assert.strictEqual(presentHeading('⚠️ Installation', 2, 'strip', 'levels').label, 'Installation');
        });

        it('defaults the icon setting to level badges', function() {
            assert.strictEqual(normalizeHeadingIconMode(undefined), 'levels');
            assert.strictEqual(normalizeHeadingIconMode('bogus'), 'levels');
            assert.strictEqual(normalizeHeadingIconMode('sections'), 'sections');
        });

        it('matches whole words only', function() {
            assert.strictEqual(iconId('Configurable widgets', 2), 'h2');
            assert.strictEqual(iconId('Latest attestations', 2), 'h2');
        });
    });
});
