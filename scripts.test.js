import { expect, test } from 'bun:test'
import { file } from 'bun'

// The browser runs every content script in one shared scope, so a top-level name declared twice stops the later
// file from loading at all; importing each file on its own in a test never shows that.
test('content scripts load together in one scope', async () => {
  const manifest = await file(new URL('./manifest.json', import.meta.url)).json()
  const files = manifest.content_scripts.flatMap((entry) => entry.js)
  const texts = await Promise.all(files.map((f) => file(new URL(`./${f}`, import.meta.url)).text()))
  expect(() => new Function(texts.join('\n;\n'))).not.toThrow()
})
