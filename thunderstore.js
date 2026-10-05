// Thunderstore package pages for games Mortar manages: marks a package already in the open profile and offers
// "Install in Mortar". The host's `games` reply names Thunderstore's key for each managed game (sources.thunderstore).
const mortarThunderstorePagePattern = /^\/c\/([^/]+)\/p\/([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)(?:\/|$)/

// The community key, namespace and package name of a package page, or undefined for any other page.
globalThis.mortarThunderstorePage = (pathname) => {
  const match = mortarThunderstorePagePattern.exec(pathname)
  return match ? { key: match[1], namespace: match[2], name: match[3] } : undefined
}

// Whether the host manages a game whose Thunderstore community is key.
globalThis.mortarThunderstoreManaged = (reply, key) =>
  Array.isArray(reply?.games) && reply.games.some((g) => g?.sources?.thunderstore === key)

// Whether the open profile holds the package; reply.packages lists Namespace-Name ids.
globalThis.mortarThunderstoreInstalled = (reply, page) =>
  Array.isArray(reply?.packages) &&
  reply.packages.some(
    (id) => String(id).toLowerCase() === `${page.namespace}-${page.name}`.toLowerCase(),
  )

// The request that asks the host which packages the open profile holds, and the one that installs a package.
globalThis.mortarThunderstoreRequest = (type, page) => ({
  type,
  source: 'thunderstore',
  sourceGameKey: page.key,
  ...(type === 'installPackage' ? { package: `${page.namespace}-${page.name}` } : {}),
})

// What the page shows after a click on the button.
globalThis.mortarThunderstoreResultText = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state === 'missing') {
    return globalThis.mortarInstallHint
  }
  if (state === 'mortarOld' || state === 'extensionOld') {
    return globalThis.mortarStateText(state)
  }
  return reply.ok === true
    ? 'Sent to Mortar'
    : reply.error || "Mortar couldn't install this package"
}

if (
  !globalThis.mortarThunderstoreWatch &&
  typeof chrome !== 'undefined' &&
  typeof document !== 'undefined'
) {
  globalThis.mortarThunderstoreWatch = true
  const page = globalThis.mortarThunderstorePage(location.pathname)
  const ask = (message) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (reply) =>
          resolve({ reply, error: chrome.runtime.lastError }),
        )
      } catch (error) {
        resolve({ error })
      }
    })
  const show = (text, button) => {
    const box = document.createElement('div')
    box.id = 'mortar-thunderstore'
    box.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;padding:8px 12px;border-radius:8px;background:#1b1a17;color:#f2efe8;font:14px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4)'
    const label = document.createElement('span')
    label.textContent = text
    box.append(label)
    if (button) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = 'Install in Mortar'
      b.style.cssText = 'padding:4px 10px;border-radius:6px;border:0;cursor:pointer'
      b.addEventListener('click', async () => {
        b.disabled = true
        const { reply, error } = await ask(
          globalThis.mortarThunderstoreRequest('installPackage', page),
        )
        label.textContent = globalThis.mortarThunderstoreResultText(reply, error)
        b.disabled = false
      })
      box.append(b)
    }
    document.getElementById('mortar-thunderstore')?.remove()
    document.body.append(box)
  }
  const run = async () => {
    if (!page) {
      return
    }
    const { reply, error } = await ask(
      globalThis.mortarThunderstoreRequest('installedPackages', page),
    )
    if (
      globalThis.mortarConnectionState(reply, error) !== 'ready' ||
      !globalThis.mortarThunderstoreManaged(reply, page.key)
    ) {
      return
    }
    globalThis.mortarSetAccent?.(reply.accent)
    if (globalThis.mortarThunderstoreInstalled(reply, page)) {
      show('In Mortar profile', false)
    } else {
      show('Mortar', true)
    }
  }
  globalThis.mortarWhenSiteEnabled('siteThunderstore', () => {
    run().catch(() => false)
  })
}
