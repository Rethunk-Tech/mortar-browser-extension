import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

// The browser runs every content script in one shared scope, so a top-level name declared twice stops the later
// file from loading at all; importing each file on its own in a test never shows that.
test('content scripts load together in one scope', () => {
  const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'))
  const files = manifest.content_scripts.flatMap((entry) => entry.js)
  const source = files
    .map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8'))
    .join('\n;\n')
  expect(() => new Function(source)).not.toThrow()
})
