// Downloads the signed .xpi AMO already holds for a version: AMO signs each version once, so a release rerun after a
// signed upload must fetch that file instead of signing again. Writes nothing when AMO has no such version.
// Usage: bun scripts/amo-signed.mjs <addon id> <version> <out.xpi>, with WEB_EXT_API_KEY and WEB_EXT_API_SECRET set.

import { argv, CryptoHasher, env, write } from 'bun'

// AMO accepts a JWT that expires within five minutes; one minute covers a request.
const tokenSeconds = 60
const msPerSecond = 1000
const notFound = 404
const base64Padding = /[=]+$/

const [id, version, out] = argv.slice(2)
const { WEB_EXT_API_KEY: key, WEB_EXT_API_SECRET: secret } = env
if (!(id && version && out && key && secret)) {
  throw new Error(
    'usage: amo-signed.mjs <addon id> <version> <out.xpi>, with WEB_EXT_API_KEY and WEB_EXT_API_SECRET',
  )
}

// The claims are ASCII, so btoa's base64 only needs its URL-safe alphabet.
const b64 = (v) => btoa(v).replaceAll('+', '-').replaceAll('/', '_').replace(base64Padding, '')
const auth = () => {
  const now = Math.floor(Date.now() / msPerSecond)
  const claims = { iss: key, jti: crypto.randomUUID(), iat: now, exp: now + tokenSeconds }
  const body = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(claims))}`
  const sig = new CryptoHasher('sha256', secret).update(body).digest('base64url')
  return `JWT ${body}.${sig}`
}

const api = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(id)}/versions/v${version}/`
const res = await fetch(api, { headers: { Authorization: auth() } })
if (res.status !== notFound) {
  if (!res.ok) {
    throw new Error(`${api}: ${res.status} ${await res.text()}`)
  }
  const { file } = await res.json()
  if (file?.status !== 'public' || !file.url) {
    throw new Error(`AMO has version ${version} but its file is ${file?.status ?? 'missing'}`)
  }
  const xpi = await fetch(file.url, { headers: { Authorization: auth() } })
  if (!xpi.ok) {
    throw new Error(`${file.url}: ${xpi.status}`)
  }
  await write(out, xpi)
}
