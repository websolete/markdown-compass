/**
 * Heading parsing and presentation for the Markdown Compass trees.
 *
 * Kept free of the `vscode` module so the parsing and icon rules can be unit
 * tested in plain Node. The runtime turns an {@link HeadingIcon} descriptor into
 * a `ThemeIcon` or an SVG path.
 */

export type HeadingEmojiMode = 'strip' | 'keep';

/**
 * `levels`: H1-H6 badges. `bars`: one to six horizontal bars per level.
 * `sections`: an icon for what the section is, falling back to the bars.
 */
export type HeadingIconMode = 'levels' | 'bars' | 'sections';

export interface MarkdownHeading {
    level: number;
    /** Heading text exactly as written, used for anchors and navigation. */
    text: string;
    /** 1-based line number in the source document. */
    line: number;
}

export type HeadingIcon =
    | { kind: 'codicon'; id: string; color: string; reason: 'emoji' | 'code' | 'keyword' | 'question' }
    | { kind: 'level'; level: number; style?: 'bars' };

export interface HeadingPresentation {
    label: string;
    icon: HeadingIcon;
}

const EMOJI_PICTOGRAPH = /\p{Extended_Pictographic}(?:️|︎)?/gu;
const EMOJI_FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;
const EMOJI_MODIFIERS = /[\u{1F3FB}-\u{1F3FF}‍️︎⃣]/gu;

/** Remove emoji, including ZWJ sequences, flags, skin tones and keycaps. */
export function stripEmoji(text: string): string {
    if (!text) {
        return '';
    }

    return text
        .replace(EMOJI_PICTOGRAPH, '')
        .replace(EMOJI_FLAG, '')
        .replace(EMOJI_MODIFIERS, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Reduce inline Markdown in a heading to the text a reader sees. */
export function stripInlineMarkdown(text: string): string {
    if (!text) {
        return '';
    }

    // Code spans keep their content verbatim, so set them aside before the
    // emphasis rules run: `__init__` must not become "init".
    const codeSpans: string[] = [];
    const withoutCode = text
        // Closing ATX sequence: "## Title ##"
        .replace(/\s+#+\s*$/, '')
        .replace(/(`+)(.+?)\1/g, (_match, _ticks, code: string) => {
            codeSpans.push(code.trim());
            return `\u0000${codeSpans.length - 1}\u0000`;
        });

    return withoutCode
        // Images and links keep their visible text.
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
        // Inline HTML tags.
        .replace(/<\/?[a-zA-Z][^>]*>/g, '')
        // Emphasis and strikethrough. Underscores only at word boundaries so
        // snake_case identifiers survive.
        .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
        .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '$1')
        .replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '$1')
        .replace(/(^|[^\w])_(?=\S)(.+?)(?<=\S)_(?!\w)/g, '$1$2')
        // Backslash escapes.
        .replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, '$1')
        .replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codeSpans[Number(index)] ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** The label a tree shows for a heading. */
export function formatHeadingLabel(text: string, emojiMode: HeadingEmojiMode = 'strip'): string {
    const plain = stripInlineMarkdown(text);
    return emojiMode === 'keep' ? plain : stripEmoji(plain);
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/;

/**
 * Extract ATX headings, skipping YAML front matter and fenced code blocks so a
 * shell comment such as `# install deps` is not read as a heading.
 */
export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];
    if (!content) {
        return headings;
    }

    const lines = content.split('\n');
    let index = 0;

    if (lines[0]?.replace(/\r$/, '').trim() === '---') {
        for (let i = 1; i < lines.length; i++) {
            const candidate = lines[i].replace(/\r$/, '').trim();
            if (candidate === '---' || candidate === '...') {
                index = i + 1;
                break;
            }
        }
    }

    let fence: { char: string; length: number } | null = null;

    for (; index < lines.length; index++) {
        const line = lines[index].replace(/\r$/, '');

        if (fence) {
            const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
            if (closing && closing[1][0] === fence.char && closing[1].length >= fence.length) {
                fence = null;
            }
            continue;
        }

        const opening = line.match(FENCE_OPEN);
        // A backtick fence's info string may not contain backticks.
        if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
            fence = { char: opening[1][0], length: opening[1].length };
            continue;
        }

        const heading = line.match(ATX_HEADING);
        if (heading) {
            headings.push({
                level: heading[1].length,
                text: heading[2],
                line: index + 1
            });
        }
    }

    return headings;
}

const COLOR = Object.freeze({
    red: 'charts.red',
    orange: 'charts.orange',
    yellow: 'charts.yellow',
    green: 'charts.green',
    blue: 'charts.blue',
    purple: 'charts.purple',
    neutral: 'charts.foreground',
    method: 'symbolIcon.methodForeground',
    key: 'symbolIcon.keyForeground'
});

interface EmojiHint {
    emoji: string[];
    id: string;
    color: string;
}

/** An author's emoji says what the section is about, so it steers the icon. */
const EMOJI_HINTS: EmojiHint[] = [
    { emoji: ['⚠', '🚨', '❗', '‼'], id: 'warning', color: COLOR.yellow },
    { emoji: ['✅', '✔', '☑', '🟢'], id: 'pass', color: COLOR.green },
    { emoji: ['❌', '⛔', '🚫', '🛑', '🔴'], id: 'error', color: COLOR.red },
    { emoji: ['🐛', '🐞'], id: 'bug', color: COLOR.red },
    { emoji: ['🚀'], id: 'rocket', color: COLOR.green },
    { emoji: ['⚙', '🔧', '🛠', '🔩'], id: 'settings-gear', color: COLOR.purple },
    { emoji: ['📦'], id: 'package', color: COLOR.orange },
    { emoji: ['📝', '✏', '✍', '🗒'], id: 'note', color: COLOR.yellow },
    { emoji: ['📚', '📖', '📘', '📗', '📕', '📙'], id: 'book', color: COLOR.blue },
    { emoji: ['💡'], id: 'lightbulb', color: COLOR.yellow },
    { emoji: ['🔒', '🔐', '🛡', '🔑'], id: 'shield', color: COLOR.red },
    { emoji: ['❓', '❔', '🤔'], id: 'question', color: COLOR.blue },
    { emoji: ['🧪', '🔬'], id: 'beaker', color: COLOR.green },
    { emoji: ['📊', '📈', '📉'], id: 'graph', color: COLOR.blue },
    { emoji: ['🔗'], id: 'link', color: COLOR.blue },
    { emoji: ['🎯'], id: 'target', color: COLOR.red },
    { emoji: ['✨', '🌟', '⭐', '🎉'], id: 'sparkle', color: COLOR.yellow },
    { emoji: ['🔥'], id: 'flame', color: COLOR.orange },
    { emoji: ['⚡'], id: 'zap', color: COLOR.yellow },
    { emoji: ['📋'], id: 'checklist', color: COLOR.blue },
    { emoji: ['🗺', '🧭'], id: 'compass', color: COLOR.blue },
    { emoji: ['🏗', '🧱'], id: 'type-hierarchy', color: COLOR.blue },
    { emoji: ['🔍', '🔎'], id: 'search', color: COLOR.blue },
    { emoji: ['💬', '🗨'], id: 'comment-discussion', color: COLOR.blue },
    { emoji: ['ℹ'], id: 'info', color: COLOR.blue },
    { emoji: ['📄', '📃', '📑'], id: 'file-text', color: COLOR.neutral },
    { emoji: ['🤝', '👥'], id: 'git-pull-request', color: COLOR.green },
    { emoji: ['📅', '🗓'], id: 'calendar', color: COLOR.blue },
    { emoji: ['🖥', '💻'], id: 'terminal', color: COLOR.neutral }
];

interface KeywordRule {
    id: string;
    color: string;
    phrases: string[];
}

/**
 * Section-name rules, matched as whole words against the cleaned heading.
 * First match wins, so warnings and fixes sit above the broad categories:
 * "Installation Troubleshooting" should read as troubleshooting.
 */
const KEYWORD_RULES: KeywordRule[] = [
    { id: 'warning', color: COLOR.yellow, phrases: ['known issues', 'known issue', 'caveats', 'caveat', 'limitations', 'limitation', 'warnings', 'warning', 'gotchas', 'gotcha', 'pitfalls', 'breaking changes', 'breaking change', 'caution', 'important'] },
    { id: 'circle-slash', color: COLOR.red, phrases: ['deprecated', 'deprecation', 'deprecations', 'removed', 'end of life'] },
    // Keep a Changelog section names.
    { id: 'diff-added', color: COLOR.green, phrases: ['added'] },
    { id: 'diff-modified', color: COLOR.blue, phrases: ['changed'] },
    { id: 'check', color: COLOR.green, phrases: ['fixed', 'fixes', 'bug fixes', 'bugfixes'] },
    { id: 'shield', color: COLOR.red, phrases: ['security', 'authentication', 'authorization', 'permissions', 'privacy', 'vulnerabilities', 'vulnerability'] },
    { id: 'bug', color: COLOR.red, phrases: ['bugs', 'bug', 'known bugs', 'bug reports', 'reporting bugs'] },
    { id: 'tools', color: COLOR.orange, phrases: ['troubleshooting', 'troubleshoot', 'debugging', 'debug', 'common problems', 'common errors', 'errors', 'diagnostics'] },
    { id: 'question', color: COLOR.blue, phrases: ['faq', 'faqs', 'frequently asked questions', 'questions', 'q&a'] },
    { id: 'list-tree', color: COLOR.neutral, phrases: ['table of contents', 'contents', 'toc'] },
    { id: 'rocket', color: COLOR.green, phrases: ['quick start', 'quickstart', 'getting started', 'get started', 'tl;dr', 'tldr'] },
    { id: 'checklist', color: COLOR.green, phrases: ['prerequisites', 'prerequisite', 'requirements', 'system requirements', 'dependencies'] },
    { id: 'cloud-download', color: COLOR.green, phrases: ['installation', 'install', 'installing', 'setup', 'set up', 'download', 'downloads'] },
    { id: 'settings-gear', color: COLOR.purple, phrases: ['configuration', 'configure', 'configuring', 'config', 'settings', 'options', 'preferences', 'environment variables', 'customization', 'customizing'] },
    { id: 'keyboard', color: COLOR.neutral, phrases: ['keyboard shortcuts', 'shortcuts', 'keybindings', 'key bindings', 'hotkeys'] },
    { id: 'terminal', color: COLOR.neutral, phrases: ['commands', 'command line', 'cli', 'scripts', 'npm scripts'] },
    { id: 'symbol-interface', color: COLOR.purple, phrases: ['api', 'api reference', 'reference', 'endpoints', 'methods', 'functions', 'interfaces', 'schema', 'properties'] },
    { id: 'code', color: COLOR.blue, phrases: ['examples', 'example', 'samples', 'sample', 'demo', 'demos', 'snippets', 'recipes'] },
    { id: 'mortar-board', color: COLOR.blue, phrases: ['tutorial', 'tutorials', 'walkthrough', 'guide', 'guides', 'how to', 'how-to', 'learn'] },
    { id: 'play', color: COLOR.green, phrases: ['usage', 'using', 'basic usage', 'how to use', 'running'] },
    { id: 'type-hierarchy', color: COLOR.blue, phrases: ['architecture', 'design', 'structure', 'project structure', 'how it works', 'internals', 'data model', 'components', 'diagram', 'diagrams'] },
    { id: 'beaker', color: COLOR.green, phrases: ['testing', 'tests', 'test', 'validation', 'verification', 'coverage', 'test plan'] },
    { id: 'dashboard', color: COLOR.orange, phrases: ['performance', 'optimization', 'optimisation', 'benchmarks', 'benchmark', 'caching', 'profiling'] },
    { id: 'package', color: COLOR.orange, phrases: ['build', 'building', 'packaging', 'compiling', 'bundling'] },
    { id: 'cloud-upload', color: COLOR.orange, phrases: ['deployment', 'deploy', 'deploying', 'publishing', 'publish', 'release process', 'releasing', 'ci', 'ci/cd'] },
    { id: 'arrow-swap', color: COLOR.orange, phrases: ['migration', 'migrating', 'upgrading', 'upgrade', 'upgrade guide'] },
    { id: 'history', color: COLOR.blue, phrases: ['changelog', 'change log', 'changes', 'release notes', 'history', "what's new", 'whats new', 'versions', 'version history'] },
    { id: 'milestone', color: COLOR.yellow, phrases: ['roadmap', 'future work', 'next steps', 'planned', 'plans', 'backlog'] },
    { id: 'tasklist', color: COLOR.yellow, phrases: ['todo', 'to do', 'to-do', 'tasks', 'task list', 'action items', 'open questions'] },
    { id: 'law', color: COLOR.neutral, phrases: ['license', 'licence', 'licensing', 'copyright', 'legal', 'terms'] },
    { id: 'git-pull-request', color: COLOR.green, phrases: ['contributing', 'contribute', 'contributors', 'contribution', 'development', 'developing', 'pull requests', 'code of conduct'] },
    { id: 'heart', color: COLOR.red, phrases: ['acknowledgements', 'acknowledgments', 'credits', 'thanks', 'authors', 'maintainers', 'sponsors'] },
    { id: 'comment-discussion', color: COLOR.blue, phrases: ['support', 'contact', 'help', 'community', 'feedback', 'getting help'] },
    { id: 'link', color: COLOR.blue, phrases: ['references', 'resources', 'see also', 'related', 'further reading', 'links', 'external links'] },
    { id: 'book', color: COLOR.blue, phrases: ['glossary', 'terminology', 'definitions', 'concepts', 'key concepts', 'documentation', 'docs'] },
    { id: 'lightbulb', color: COLOR.yellow, phrases: ['tips', 'tip', 'hints', 'best practices', 'notes', 'note', 'recommendations'] },
    { id: 'sparkle', color: COLOR.yellow, phrases: ['features', 'feature', 'highlights', "what's included", 'capabilities'] },
    { id: 'info', color: COLOR.blue, phrases: ['overview', 'introduction', 'intro', 'about', 'summary', 'background', 'motivation', 'description', 'purpose', 'goals', 'context', 'conclusion'] }
];

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COMPILED_KEYWORD_RULES = KEYWORD_RULES.map(rule => ({
    ...rule,
    pattern: new RegExp(
        `(?:^|[^a-z0-9])(?:${rule.phrases.map(escapeRegExp).join('|')})(?:$|[^a-z0-9])`,
        'i'
    )
}));

function findEmojiHint(text: string): EmojiHint | undefined {
    const emoji = text.match(/\p{Extended_Pictographic}/u);
    if (!emoji) {
        return undefined;
    }

    return EMOJI_HINTS.find(hint => hint.emoji.includes(emoji[0]));
}

const METHOD_SHAPE = /^(?:new\s+)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(.*\)$/;
// "1.7.2", "v2.0.0", "[1.7.2] - 2026-11-26" and "Unreleased" in a changelog.
const VERSION_SHAPE = /^(?:\[?v?\d+(?:\.\d+)+\b|\[?unreleased\]?(?:$|\s))/i;

function findCodeShape(rawText: string, plainText: string): HeadingIcon | undefined {
    if (METHOD_SHAPE.test(plainText)) {
        return { kind: 'codicon', id: 'symbol-method', color: COLOR.method, reason: 'code' };
    }

    // Only a heading written entirely as a code span counts as a key or
    // identifier; guessing from dots alone would catch "Node.js".
    if (/^(`+)[^`]+\1$/.test(rawText.replace(/\s+#+\s*$/, '').trim())) {
        return { kind: 'codicon', id: 'symbol-key', color: COLOR.key, reason: 'code' };
    }

    if (VERSION_SHAPE.test(plainText)) {
        return { kind: 'codicon', id: 'tag', color: COLOR.blue, reason: 'code' };
    }

    return undefined;
}

/**
 * Choose an icon for a heading. Order: the author's emoji, a code-shaped
 * heading, a known section name, a question, and finally the level bars.
 */
export function resolveHeadingIcon(rawText: string, level: number): HeadingIcon {
    const emojiHint = findEmojiHint(rawText || '');
    if (emojiHint) {
        return { kind: 'codicon', id: emojiHint.id, color: emojiHint.color, reason: 'emoji' };
    }

    const plainText = stripEmoji(stripInlineMarkdown(rawText || ''));
    const codeShape = findCodeShape(rawText || '', plainText);
    if (codeShape) {
        return codeShape;
    }

    const rule = COMPILED_KEYWORD_RULES.find(candidate => candidate.pattern.test(plainText));
    if (rule) {
        return { kind: 'codicon', id: rule.id, color: rule.color, reason: 'keyword' };
    }

    if (plainText.endsWith('?')) {
        return { kind: 'codicon', id: 'question', color: COLOR.blue, reason: 'question' };
    }

    // Nothing to infer: show the level as bars, the default style.
    return { ...levelBadge(level), style: 'bars' };
}

function levelBadge(level: number): Extract<HeadingIcon, { kind: 'level' }> {
    return { kind: 'level', level: Math.min(Math.max(level || 1, 1), 6) };
}

export function presentHeading(
    rawText: string,
    level: number,
    emojiMode: HeadingEmojiMode = 'strip',
    iconMode: HeadingIconMode = 'sections'
): HeadingPresentation {
    return {
        label: formatHeadingLabel(rawText, emojiMode) || stripInlineMarkdown(rawText) || rawText,
        icon: iconMode === 'sections'
            ? resolveHeadingIcon(rawText, level)
            : iconMode === 'bars'
                ? { ...levelBadge(level), style: 'bars' }
                : levelBadge(level)
    };
}

export function normalizeHeadingEmojiMode(value: unknown): HeadingEmojiMode {
    return value === 'keep' ? 'keep' : 'strip';
}

/** Bars are the default; badges and section icons are opt-in. */
export function normalizeHeadingIconMode(value: unknown): HeadingIconMode {
    return value === 'sections' || value === 'levels' ? value : 'bars';
}
