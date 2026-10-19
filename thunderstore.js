// Thunderstore package pages for games Mortar manages: marks a package already in the open profile and offers
// "Install in Mortar". The host's `games` reply names Thunderstore's key for each managed game (sources.thunderstore).
const mortarThunderstorePagePattern = /^\/c\/([^/]+)\/p\/([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)(?:\/|$)/
const mortarThunderstoreListingPattern = /^\/c\/([^/]+)\/?$/

// The community key, namespace and package name of a package page, or undefined for any other page.
globalThis.mortarThunderstorePage = (pathname) => {
  const match = mortarThunderstorePagePattern.exec(pathname)
  return match ? { key: match[1], namespace: match[2], name: match[3] } : undefined
}

// A community listing or community search (`/c/<community>/`), not a package page.
globalThis.mortarThunderstoreListing = (pathname) => {
  const match = mortarThunderstoreListingPattern.exec(pathname)
  return match ? { key: match[1] } : undefined
}

// Namespace-Name id from a listing tile link, lowercased to match installedPackages.
globalThis.mortarThunderstorePackageId = (href, key) => {
  try {
    const page = globalThis.mortarThunderstorePage(
      new URL(href, 'https://thunderstore.io').pathname,
    )
    if (!page || page.key !== key) {
      return
    }
    return `${page.namespace}-${page.name}`.toLowerCase()
  } catch {
    return
  }
}

globalThis.mortarThunderstoreListingLinkSelector = 'a[href*="/c/"][href*="/p/"]'

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
globalThis.mortarThunderstoreResultText = (reply, lastError) =>
  globalThis.mortarHostResultText(reply, lastError, "Mortar couldn't install this package")

// What the package page overlay shows: a connection problem, In Mortar profile, or the install button.
// An unmanaged community stays untouched, the same as a page that is not a package page.
globalThis.mortarThunderstoreOverlay = (reply, lastError, page) => {
  if (!page) {
    return
  }
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state !== 'ready') {
    return { text: globalThis.mortarThunderstoreResultText(reply, lastError), button: false }
  }
  if (!globalThis.mortarThunderstoreManaged(reply, page.key)) {
    return
  }
  if (globalThis.mortarThunderstoreInstalled(reply, page)) {
    return { text: 'In Mortar profile', button: false }
  }
  return { text: 'Mortar', button: true }
}

globalThis.mortarThunderstoreListingClasses = {
  markerClass: 'mortar-installed-mod',
  hiddenClass: 'mortar-hidden-mod',
  removedClass: 'mortar-removed-mod',
  badgeClass: 'mortar-installed-mod-badge',
}

globalThis.mortarEnsureThunderstoreListingStyle = (doc) => {
  if (doc.getElementById('mortar-installed-mod-style')) {
    return
  }
  const { markerClass, badgeClass, hiddenClass, removedClass } =
    globalThis.mortarThunderstoreListingClasses
  const style = doc.createElement('style')
  style.id = 'mortar-installed-mod-style'
  style.textContent = `
      .${markerClass} { outline: 2px solid #0CDF64 !important; outline-offset: -2px; position: relative; }
      .${badgeClass} {
        background: #0CDF64; border-radius: 3px; color: #1b1a17; display: inline-block;
        font: 600 11px/1.4 sans-serif; margin: 4px; padding: 2px 5px; position: relative; z-index: 1;
      }
      .${hiddenClass} { opacity: 0.35; filter: grayscale(1); transition: opacity 120ms, filter 120ms; }
      .${removedClass} { display: none !important; }
      .${hiddenClass}:hover { opacity: 0.85; filter: grayscale(0.4); }
    `
  doc.documentElement.append(style)
}

globalThis.mortarClearThunderstoreListingMarks = (root) => {
  globalThis.mortarClearUnlistedMarks({
    root,
    tiles: new Map(),
    ...globalThis.mortarThunderstoreListingClasses,
  })
}

// Outline, gray, or hide listing tiles that are in the open profile. No obsolete/broken rows.
globalThis.mortarPaintThunderstoreListingMarks = ({
  document,
  listing,
  reply,
  lastError,
  settings,
}) => {
  const classes = globalThis.mortarThunderstoreListingClasses
  const mode = globalThis.mortarInstalledMode(settings)
  const managed =
    globalThis.mortarConnectionState(reply, lastError) === 'ready' &&
    globalThis.mortarThunderstoreManaged(reply, listing.key)
  if (mode === 'off' || !managed) {
    globalThis.mortarClearThunderstoreListingMarks(document)
    return
  }
  const ids = new Set(
    (Array.isArray(reply.packages) ? reply.packages : []).map((id) => String(id).toLowerCase()),
  )
  const tiles = globalThis.mortarCollectInstalledTiles({
    root: document,
    ids,
    modID: (href) => globalThis.mortarThunderstorePackageId(href, listing.key),
    tileFor: (link) => link.closest('article, li') || link,
    linkSelector: globalThis.mortarThunderstoreListingLinkSelector,
  })
  globalThis.mortarEnsureThunderstoreListingStyle(document)
  globalThis.mortarClearUnlistedMarks({ root: document, tiles, ...classes })
  globalThis.mortarApplyListingHideMarks({
    document,
    tiles,
    gray: mode === 'highlight',
    remove: mode === 'hide',
    updates: new Set(),
    showUpdates: false,
    ...classes,
  })
}

if (
  !globalThis.mortarThunderstoreWatch &&
  typeof chrome !== 'undefined' &&
  typeof document !== 'undefined'
) {
  globalThis.mortarThunderstoreWatch = true
  const page = globalThis.mortarThunderstorePage(location.pathname)
  const listing = globalThis.mortarThunderstoreListing(location.pathname)
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
    const host = document.createElement('div')
    host.id = 'mortar-thunderstore'
    const root = host.attachShadow({ mode: 'closed' })
    const box = document.createElement('div')
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
      b.addEventListener('click', (event) => {
        globalThis.mortarIfTrusted(event, async () => {
          b.disabled = true
          const { reply, error } = await ask(
            globalThis.mortarThunderstoreRequest('installPackage', page),
          )
          label.textContent = globalThis.mortarThunderstoreResultText(reply, error)
          b.disabled = false
        })
      })
      box.append(b)
    }
    root.append(box)
    document.getElementById('mortar-thunderstore')?.remove()
    document.body.append(host)
  }
  const runPackage = async () => {
    if (!page) {
      return
    }
    const { reply, error } = await ask(
      globalThis.mortarThunderstoreRequest('installedPackages', page),
    )
    const overlay = globalThis.mortarThunderstoreOverlay(reply, error, page)
    if (!overlay) {
      return
    }
    globalThis.mortarSetAccent?.(reply?.accent)
    show(overlay.text, overlay.button)
  }
  const runListing = async () => {
    if (!listing) {
      return
    }
    const settings = await globalThis.mortarReadSettings()
    const { reply, error } = await ask(
      globalThis.mortarThunderstoreRequest('installedPackages', listing),
    )
    globalThis.mortarSetAccent?.(reply?.accent)
    globalThis.mortarPaintThunderstoreListingMarks({
      document,
      listing,
      reply,
      lastError: error,
      settings,
    })
  }
  const run = async () => {
    await runPackage()
    await runListing()
  }
  let siteOn = false
  try {
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area === 'sync' && siteOn && listing) {
        runListing().catch(() => false)
      }
    })
  } catch {
    // Tests and a page without chrome.storage still get the first paint.
  }
  globalThis.mortarWhenSiteEnabled(
    'siteThunderstore',
    () => {
      siteOn = true
      run().catch(() => false)
    },
    () => {
      siteOn = false
      document.getElementById('mortar-thunderstore')?.remove()
      globalThis.mortarClearThunderstoreListingMarks(document)
    },
  )
}
