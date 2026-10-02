// Nexus shows the Mod Manager Download link as an nxm:// anchor ("Start download manually") inside the download
// widget's open shadow root. Chromium launches at most one external protocol per user gesture, so in a burst of tabs
// most of the page's own launches are blocked; handing the link to Mortar through native messaging avoids that gate.
// Mutation observers, not a timer, find the link: background tabs throttle timers to as little as once a minute.
// The background script also injects this file into Nexus tabs that were open before the extension loaded, so a
// tab can run it twice; the flag keeps one copy.
if (!globalThis.mortarNxmWatch) {
  globalThis.mortarNxmWatch = true
  const sent = new Set()
  const skipped = new Set()
  const watched = new WeakSet()
  const installedCacheDuration = 60_000
  const numericModPath = /^\d+$/
  const modLink = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
  const modPagePath = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
  const pageVersionPattern = /\d+(?:\.\d+)+/
  const modeKey = 'mode'
  const markerClass = 'mortar-installed-mod'
  const hiddenClass = 'mortar-hidden-mod'
  const badgeClass = 'mortar-installed-mod-badge'
  const panelClass = 'mortar-mod-panel'
  const cardSelectors =
    '[data-testid*="mod-tile"], [data-testid*="mod-card"], .mod-tile, .mod-listing, article, li'
  let mode
  let markScheduled = false
  let installedRequest
  let installedCache = { at: 0, ids: new Set() }

  // A tab opened just for this download is closed once Mortar has the link: every history entry is this mod's own
  // page (its description, its files tab, the download page). A tab with any other history stays open. Only the
  // Navigation API lists entries with their addresses, and only same-origin ones, so a history longer than its
  // list came from elsewhere; without the API nothing is closed.
  const trailingSlash = /\/$/
  const modPath = location.pathname.match(/^\/[^/]+\/mods\/\d+/)?.[0]
  const throwaway = () => {
    const entries = globalThis.navigation?.entries?.()
    if (!(modPath && entries) || entries.length !== history.length) {
      return false
    }
    return entries.every((e) => {
      const u = new URL(e.url)
      return u.origin === location.origin && u.pathname.replace(trailingSlash, '') === modPath
    })
  }

  const pageGame = () => location.pathname.split('/').find(Boolean) || ''

  const isModListing = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length < 2 || (parts[1] !== 'mods' && parts[1] !== 'search')) {
      return false
    }
    return !(parts[1] === 'mods' && numericModPath.test(parts[2] || ''))
  }

  const readMode = () =>
    new Promise((resolve) => {
      if (!chrome.storage?.local) {
        resolve('highlight')
        return
      }
      try {
        chrome.storage.local.get({ [modeKey]: 'highlight' }, (result) => {
          if (chrome.runtime.lastError) {
            resolve('highlight')
            return
          }
          const value = result?.[modeKey]
          resolve(value === 'hide' || value === 'off' ? value : 'highlight')
        })
      } catch {
        resolve('highlight')
      }
    })

  const currentMode = async () => {
    if (mode) {
      return mode
    }
    mode = await readMode()
    return mode
  }

  const installedIDs = () => {
    const now = Date.now()
    if (now - installedCache.at < installedCacheDuration) {
      return Promise.resolve(installedCache.ids)
    }
    if (installedRequest) {
      return installedRequest
    }
    clearMarks()
    installedRequest = new Promise((resolve) => {
      const empty = () => {
        installedCache = { at: Date.now(), ids: new Set() }
        resolve(installedCache.ids)
      }
      try {
        chrome.runtime.sendMessage({ type: 'installed', game: pageGame() }, (reply) => {
          if (chrome.runtime.lastError || !Array.isArray(reply?.modIds)) {
            empty()
            return
          }
          const ids = new Set(reply.modIds.filter((id) => Number.isInteger(id) && id > 0))
          installedCache = { at: Date.now(), ids }
          resolve(ids)
        })
      } catch {
        empty()
      }
    }).finally(() => {
      installedRequest = undefined
    })
    return installedRequest
  }

  const modPageID = () => {
    const match = location.pathname.match(modPagePath)
    return match ? Number(match[1]) : undefined
  }

  const versionParts = (value) =>
    String(value || '')
      .match(/\d+/g)
      ?.map(Number) || []
  const newerVersion = (page, installed) => {
    const a = versionParts(page)
    const b = versionParts(installed)
    if (a.length === 0 || b.length === 0) {
      return false
    }
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if ((a[i] || 0) !== (b[i] || 0)) {
        return (a[i] || 0) > (b[i] || 0)
      }
    }
    return false
  }

  const pageVersion = () => {
    const element = document.querySelector('[data-testid*="version"], .mod-version, .version')
    return element?.textContent?.match(pageVersionPattern)?.[0] || ''
  }

  const renderModPanel = async () => {
    const id = modPageID()
    if (id === undefined) {
      return
    }
    const selectedMode = await currentMode()
    const existing = document.querySelector(`.${panelClass}`)
    if (selectedMode === 'off') {
      existing?.remove()
      return
    }
    const reply = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'mod', game: pageGame(), modId: id }, resolve)
      } catch {
        resolve(undefined)
      }
    })
    if (mode !== selectedMode || !reply?.open?.profile) {
      return
    }
    const installed = reply.open.version
    const lines = [
      installed ? `In ${reply.open.profile}: v${installed}` : `Not in ${reply.open.profile}`,
    ]
    if (Array.isArray(reply.others) && reply.others.length > 0) {
      lines.push(`Also in: ${reply.others.map((profile) => profile.profile).join(', ')}`)
    }
    if (newerVersion(pageVersion(), installed)) {
      lines.push('Nexus has a newer version')
    }
    const panel = existing || document.createElement('div')
    panel.className = panelClass
    panel.textContent = lines.join(' · ')
    if (!existing) {
      const title = document.querySelector('h1')
      title?.parentElement?.insertBefore(panel, title.nextSibling)
    }
  }

  const ensureMarkerStyle = () => {
    if (document.getElementById('mortar-installed-mod-style')) {
      return
    }
    const style = document.createElement('style')
    style.id = 'mortar-installed-mod-style'
    style.textContent = `
      .${markerClass} { outline: 2px solid #d2a84a !important; outline-offset: -2px; }
      .${markerClass} { position: relative; }
      .${badgeClass} {
        background: #d2a84a;
        border-radius: 3px;
        color: #1d1b16;
        display: inline-block;
        font: 600 11px/1.4 sans-serif;
        margin: 4px;
        padding: 2px 5px;
        position: relative;
        z-index: 1;
      }
      .${hiddenClass} { display: none !important; }
      .${panelClass} {
        background: #242424;
        border-left: 3px solid #d2a84a;
        color: #c7c7c7;
        font: 13px/1.5 sans-serif;
        margin: 8px 0;
        padding: 6px 10px;
      }
    `
    document.documentElement.append(style)
  }

  const clearMarks = () => {
    for (const tile of document.querySelectorAll(`.${markerClass}, .${hiddenClass}`)) {
      tile.classList.remove(markerClass, hiddenClass)
      tile.querySelector(`.${badgeClass}`)?.remove()
    }
  }

  const modID = (href) => {
    try {
      const url = new URL(href, location.href)
      if (url.origin !== location.origin) {
        return
      }
      const match = url.pathname.match(modLink)
      return match ? Number(match[1]) : undefined
    } catch {
      return
    }
  }

  const tileFor = (link) => link.closest(cardSelectors) || link

  const markInstalled = async () => {
    if (!isModListing()) {
      return
    }
    const selectedMode = await currentMode()
    if (selectedMode === 'off') {
      clearMarks()
      return
    }
    const ids = await installedIDs()
    if (mode !== selectedMode) {
      return
    }
    const tiles = new Set()
    for (const link of document.querySelectorAll('a[href]')) {
      const id = modID(link.href)
      if (id !== undefined && ids.has(id)) {
        tiles.add(tileFor(link))
      }
    }
    if (tiles.size === 0) {
      return
    }
    ensureMarkerStyle()
    for (const tile of tiles) {
      tile.classList.add(markerClass)
      if (selectedMode === 'hide') {
        tile.classList.add(hiddenClass)
      } else if (!tile.querySelector(`.${badgeClass}`)) {
        const badge = document.createElement('span')
        badge.className = badgeClass
        badge.textContent = 'In profile'
        tile.prepend(badge)
      }
    }
  }

  const requestMark = () => {
    if (markScheduled) {
      return
    }
    markScheduled = true
    queueMicrotask(() => {
      markScheduled = false
      markInstalled().catch(() => false)
    })
  }

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes[modeKey]) {
      mode =
        changes[modeKey].newValue === 'hide' || changes[modeKey].newValue === 'off'
          ? changes[modeKey].newValue
          : 'highlight'
      clearMarks()
      requestMark()
      renderModPanel().catch(() => false)
    }
  })

  // A copy left in an open tab when the extension is reloaded or removed loses chrome.runtime; the new copy takes
  // over, so the old one stays quiet.
  const scan = (root) => {
    if (!chrome.runtime?.id) {
      return
    }
    // Mod manager download first opens a "Download mod file" dialog listing the file's requirements. Mortar
    // resolves those itself, so the dialog's Download link (the one carrying nmm=1) is followed straight away.
    for (const a of root.querySelectorAll(
      '[role="dialog"] a.nxm-button-flamework[href*="nmm=1"]',
    )) {
      if (!skipped.has(a.href)) {
        skipped.add(a.href)
        a.click()
      }
    }
    for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
      if (!sent.has(a.href)) {
        sent.add(a.href)
        chrome.runtime.sendMessage({ link: a.href, close: throwaway() })
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        watch(el.shadowRoot)
      }
    }
    requestMark()
    renderModPanel().catch(() => false)
  }

  const watch = (root) => {
    if (watched.has(root)) {
      return
    }
    watched.add(root)
    new MutationObserver(() => scan(root)).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href'],
    })
    scan(root)
  }

  watch(document)
}
