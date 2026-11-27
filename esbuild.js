const fs = require('fs');
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const problemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      // Read by the inline problem matcher in .vscode/tasks.json: "[ERROR] message"
      // followed by an indented "file:line:column:" line.
      for (const { text, location } of result.errors) {
        console.error(`[ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      }
      console.log('[watch] build finished');
    });
  },
};

async function main() {
  fs.rmSync('dist', { recursive: true, force: true });

  const context = await esbuild.context({
    entryPoints: {
      extension: 'src/extension.ts',
      'providers/favorites-provider': 'src/providers/favorites-provider.ts',
      'services/markdown-preview-link-validator': 'src/services/markdown-preview-link-validator.ts',
      'services/markdown-safe-preview-plugin': 'src/services/markdown-safe-preview-plugin.ts',
      'services/heading-presentation': 'src/services/heading-presentation.ts',
    },
    bundle: true,
    format: 'cjs',
    minify: production,
    platform: 'node',
    target: 'node20',
    sourcemap: !production,
    sourcesContent: false,
    outdir: 'dist',
    entryNames: '[name]',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [problemMatcherPlugin],
  });

  if (watch) {
    await context.watch();
    return;
  }

  const result = await context.rebuild();
  await context.dispose();
  if (result.errors.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});