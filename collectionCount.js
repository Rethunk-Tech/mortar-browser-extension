const mortarCollectionLinkModID = (link, origin) => {
  try {
    const href = link.getAttribute('href') || ''
    const url = new URL(href, origin || 'https://www.nexusmods.com/')
    if (origin && url.origin !== origin) {
      return
    }
    return globalThis.mortarNexusModID?.(url.pathname)
  } catch {
    return
  }
}

globalThis.mortarCollectionPageModIDs = (root, origin) => {
  const ids = []
  const seen = new Set()
  for (const link of root.querySelectorAll(globalThis.mortarTileLinkSelector)) {
    const id = mortarCollectionLinkModID(link, origin)
    if (id !== undefined && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

globalThis.mortarCollectionInProfileLine = (ids, installed, profileName) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return ''
  }
  const have = installed instanceof Set ? installed : new Set(installed || [])
  let n = 0
  for (const id of ids) {
    if (have.has(id)) {
      n += 1
    }
  }
  return `${n} of ${globalThis.mortarPlural(ids.length, 'mod', 'mods')} already in ${profileName}`
}

// The count row sits in the collection menu; it is written only when its text changes, because the menu's own
// changes must not look like page changes.
globalThis.mortarFillCollectionInProfile = async (
  doc,
  origin,
  { installedIDs, installedCache },
) => {
  const host = doc.querySelector('.mortar-collection-panel')
  if (!(host?._mortarMenu && host.shadowRoot)) {
    return
  }
  const menu = host.shadowRoot.querySelector('.menu')
  const footer = menu?.querySelector('.footer')
  if (!footer) {
    return
  }
  const installed = await installedIDs()
  const cache = installedCache()
  const line =
    cache.connected && cache.profile
      ? globalThis.mortarCollectionInProfileLine(
          globalThis.mortarCollectionPageModIDs(doc, origin),
          installed,
          cache.profile,
        )
      : ''
  const row = menu.querySelector('.collection-count')
  if (!line) {
    row?.remove()
  } else if (!row) {
    const created = doc.createElement('p')
    created.className = 'body collection-count'
    created.textContent = line
    footer.parentNode.insertBefore(created, footer)
  } else if (row.textContent !== line) {
    row.textContent = line
  }
}

if (
  typeof globalThis.mortarRenderCollectionPanel === 'function' &&
  !globalThis.mortarRenderCollectionPanel._mortarCount
) {
  const inner = globalThis.mortarRenderCollectionPanel
  const wrapped = async (doc, pathname, opts) => {
    await inner(doc, pathname, opts)
    await globalThis.mortarFillCollectionInProfile?.(doc, doc?.location?.origin || '', opts)
  }
  wrapped._mortarCount = true
  globalThis.mortarRenderCollectionPanel = wrapped
}
