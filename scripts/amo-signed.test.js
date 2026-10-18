import { expect, test } from 'bun:test'
import { amoSigned } from './amo-signed.mjs'

const creds = { WEB_EXT_API_KEY: 'k', WEB_EXT_API_SECRET: 's' }
const args = ['bun', 'scripts/amo-signed.mjs', 'id@x', '1.0.0', '/tmp/out.xpi']
const refuseWrite = () => {
  throw new Error('must not write')
}

const run = (fetchFn, writeFn = refuseWrite) =>
  amoSigned({
    argv: args,
    env: creds,
    fetch: fetchFn,
    write: writeFn,
  })

test('usage fails without the addon id, version, output path, and AMO keys', async () => {
  await expect(amoSigned({ argv: ['bun', 'x'], env: {} })).rejects.toThrow(/usage:/)
})

test('the version request is encoded and every fetch aborts on timeout', async () => {
  const opts = []
  await run((url, init) => {
    opts.push({ url, signal: init.signal })
    return new Response(null, { status: 404 })
  })
  expect(opts[0].url).toBe('https://addons.mozilla.org/api/v5/addons/addon/id%40x/versions/v1.0.0/')
  expect(opts[0].signal).toBeInstanceOf(AbortSignal)
})

test('a file URL off addons.mozilla.org is refused and not fetched', async () => {
  const urls = []
  await expect(
    run((url) => {
      urls.push(url)
      return Response.json({ file: { status: 'public', url: 'https://evil.example/x.xpi' } })
    }),
  ).rejects.toThrow(/addons\.mozilla\.org/)
  expect(urls).toEqual(['https://addons.mozilla.org/api/v5/addons/addon/id%40x/versions/v1.0.0/'])
})

test('a download that redirects off addons.mozilla.org is not written', async () => {
  await expect(
    run((url) => {
      if (url.startsWith('https://addons.mozilla.org/api/')) {
        return Response.json({
          file: {
            status: 'public',
            url: 'https://addons.mozilla.org/firefox/downloads/file/1.xpi',
          },
        })
      }
      return { ok: true, status: 200, url: 'https://evil.example/x.xpi' }
    }),
  ).rejects.toThrow(/addons\.mozilla\.org/)
})

test('an AMO error response does not include the body', async () => {
  await expect(run(() => new Response('secret-token', { status: 401 }))).rejects.toThrow(
    /^https:\/\/addons\.mozilla\.org\/.*: 401$/,
  )
})
