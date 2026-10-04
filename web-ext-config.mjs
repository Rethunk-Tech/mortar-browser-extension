// Only the extension's own files ship; web-ext already leaves out dotfiles, node_modules and archives.
export default {
  ignoreFiles: [
    '**/*.test.js',
    'docs',
    'package.json',
    'bun.lock',
    'biome.json',
    '*.md',
    'web-ext-config.mjs',
    'dist',
  ],
  build: { overwriteDest: true },
  lint: { selfHosted: true },
}
