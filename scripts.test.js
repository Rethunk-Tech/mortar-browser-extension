import { expect, test } from 'bun:test'
import { file } from 'bun'

// The browser runs every content script in one shared scope, so a top-level name declared twice stops the later
// file from loading at all; importing each file on its own in a test never shows that.
test('content scripts load together in one scope', async () => {
  const manifest = await file(new URL('./manifest.json', import.meta.url)).json()
  for (const entry of manifest.content_scripts) {
    const texts = await Promise.all(
      entry.js.map((f) => file(new URL(`./${f}`, import.meta.url)).text()),
    )
    expect(() => new Function(texts.join('\n;\n'))).not.toThrow()
  }
})

// The Chrome Web Store rejects a package whose manifest description is longer than 132 characters.
test('manifest description fits the Chrome Web Store limit', async () => {
  const manifest = await file(new URL('./manifest.json', import.meta.url)).json()
  expect(manifest.description.length).toBeLessThanOrEqual(132)
})
