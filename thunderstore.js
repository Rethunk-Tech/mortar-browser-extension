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

// The package page a listing tile link points at, or undefined for another community or a non-package link.
globalThis.mortarThunderstoreLinkPage = (href, key) => {
  try {
    const page = globalThis.mortarThunderstorePage(
      new URL(href, 'https://thunderstore.io').pathname,
    )
    return page?.key === key ? page : undefined
  } catch {
    return
  }
}

// Namespace-Name id from a listing tile link, lowercased to match installedPackages.
globalThis.mortarThunderstorePackageId = (href, key) => {
  const page = globalThis.mortarThunderstoreLinkPage(href, key)
  return page ? `${page.namespace}-${page.name}`.toLowerCase() : undefined
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

const mortarDeprecatedCache = new Map()

// Whether Thunderstore marks the package deprecated; the listing carries no flag, so the package's API record says.
// A failed lookup counts as not deprecated, and each package is asked once per page.
globalThis.mortarThunderstoreDeprecated = (fetchJson, page) => {
  const id = `${page.namespace}-${page.name}`.toLowerCase()
  if (!mortarDeprecatedCache.has(id)) {
    mortarDeprecatedCache.set(
      id,
      fetchJson(`/api/experimental/package/${page.namespace}/${page.name}/`).then(
        (body) => body?.is_deprecated === true,
        () => false,
      ),
    )
  }
  return mortarDeprecatedCache.get(id)
}

globalThis.mortarThunderstoreFetchJson = async (path) => {
  const response = await fetch(path)
  return response.ok ? response.json() : undefined
}

// Dims (Gray out) or removes (Hide) the listing tiles of deprecated packages while the Obsolete row is not Off, and
// returns how many tiles it marked.
globalThis.mortarPaintThunderstoreDeprecated = async ({
  document,
  listing,
  settings,
  fetchJson,
}) => {
  const mode = settings.markObsolete
  const tiles = new Map()
  for (const link of document.querySelectorAll(globalThis.mortarThunderstoreListingLinkSelector)) {
    const page = globalThis.mortarThunderstoreLinkPage(link.href, listing.key)
    if (page) {
      tiles.set(link.closest('article, li') || link, page)
    }
  }
  let count = 0
  await Promise.all(
    [...tiles].map(async ([tile, page]) => {
      const on = mode !== 'off' && (await globalThis.mortarThunderstoreDeprecated(fetchJson, page))
      tile.classList.toggle(globalThis.mortarDeprecatedClasses.dim, on && mode === 'gray')
      tile.classList.toggle(globalThis.mortarDeprecatedClasses.removed, on && mode === 'hide')
      count += on ? 1 : 0
    }),
  )
  return count
}

globalThis.mortarClearThunderstoreListingMarks = (root) => {
  for (const tile of root.querySelectorAll(
    `.${globalThis.mortarDeprecatedClasses.dim}, .${globalThis.mortarDeprecatedClasses.removed}`,
  )) {
    tile.classList.remove(
      globalThis.mortarDeprecatedClasses.dim,
      globalThis.mortarDeprecatedClasses.removed,
    )
  }
  globalThis.mortarClearUnlistedMarks({
    root,
    tiles: new Map(),
    ...globalThis.mortarSimpleListingClasses,
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
  const classes = globalThis.mortarSimpleListingClasses
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
  globalThis.mortarEnsureSimpleListingStyle(document)
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
    globalThis.mortarCornerCard(
      document,
      { id: 'mortar-thunderstore', corner: 'bottom-right' },
      (card) => {
        const label = document.createElement('span')
        label.className = 'text'
        label.textContent = text
        card.append(label)
        if (button) {
          const b = globalThis.mortarUiButton(document, 'Install in Mortar', true)
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
          card.append(b)
        }
      },
    )
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
    const settings = await globalThis.mortarReadSettings()
    const deprecated =
      settings.markObsolete !== 'off' &&
      (await globalThis.mortarThunderstoreDeprecated(globalThis.mortarThunderstoreFetchJson, page))
    show(deprecated ? `${overlay.text} · Deprecated` : overlay.text, overlay.button)
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
    const deprecated = await globalThis.mortarPaintThunderstoreDeprecated({
      document,
      listing,
      settings,
      fetchJson: globalThis.mortarThunderstoreFetchJson,
    })
    const ready =
      globalThis.mortarConnectionState(reply, error) === 'ready' &&
      globalThis.mortarThunderstoreManaged(reply, listing.key)
    globalThis.mortarShowFilterBox(
      document,
      globalThis.mortarFilterBoxRows(settings, [
        {
          row: 'installed',
          label: 'Gray out in profile',
          count: document.querySelectorAll('.mortar-installed-mod, .mortar-removed-mod').length,
          disabled: !ready,
          title: ready
            ? ''
            : globalThis.mortarStateText(globalThis.mortarConnectionState(reply, error)),
        },
        { row: 'deprecated', label: 'Gray out deprecated', count: deprecated },
      ]),
    )
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
      globalThis.mortarRemoveFilterBox(document)
      globalThis.mortarClearThunderstoreListingMarks(document)
    },
  )
}
