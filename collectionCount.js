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
  for (const link of root.querySelectorAll('a[href]')) {
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
  return `${n} of ${ids.length} mods already in ${profileName}`
}

globalThis.mortarFillCollectionInProfile = async (doc, origin, game) => {
  const host = doc.querySelector('.mortar-collection-panel')
  if (!(host?._mortarMenu && host.shadowRoot)) {
    return
  }
  const ids = globalThis.mortarCollectionPageModIDs(doc, origin)
  const menu = host.shadowRoot.querySelector('.menu')
  const footer = menu?.querySelector('.footer')
  menu?.querySelector('.collection-count')?.remove()
  if (!footer || ids.length === 0) {
    return
  }
  const profileName =
    (await new Promise((resolve) => {
      try {
        chrome.storage.session.get(['updatesReply'], (stored) => {
          resolve(stored?.updatesReply?.profile || '')
        })
      } catch {
        resolve('')
      }
    })) ||
    host.shadowRoot.querySelector('.profile')?.textContent ||
    ''
  let installed = new Set()
  try {
    const reply = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'installed', game }, resolve)
    })
    globalThis.mortarSetAccent?.(reply?.accent)
    if (Array.isArray(reply?.modIds)) {
      installed = new Set(reply.modIds.filter((id) => Number.isInteger(id) && id > 0))
    }
  } catch {
    return
  }
  const line = globalThis.mortarCollectionInProfileLine(ids, installed, profileName)
  if (!line) {
    return
  }
  const row = doc.createElement('p')
  row.className = 'body collection-count'
  row.textContent = line
  footer.parentNode.insertBefore(row, footer)
}

if (
  typeof globalThis.mortarRenderCollectionPanel === 'function' &&
  !globalThis.mortarRenderCollectionPanel._mortarCount
) {
  const inner = globalThis.mortarRenderCollectionPanel
  const wrapped = async (doc, pathname, opts) => {
    await inner(doc, pathname, opts)
    const parts = String(pathname || '')
      .split('/')
      .filter(Boolean)
    const game = (parts[0] === 'games' ? parts[1] : parts[0]) || ''
    await globalThis.mortarFillCollectionInProfile?.(doc, doc?.location?.origin || '', game)
  }
  wrapped._mortarCount = true
  globalThis.mortarRenderCollectionPanel = wrapped
}
