// Only the extension's own files ship; web-ext already leaves out dotfiles, node_modules and archives.
export const ignoreFiles = [
  '**/*.test.js',
  'docs',
  'testdata',
  'media',
  'package.json',
  'bun.lock',
  'biome.jsonc',
  'CODEOWNERS',
  'knip.json',
  'turbo.json',
  'lefthook.yml',
  'scripts',
  '*.md',
  'web-ext-config.mjs',
  'dist',
  'canon.toml',
]
export const build = { overwriteDest: true }
export const lint = { selfHosted: true }
