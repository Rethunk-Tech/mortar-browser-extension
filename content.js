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
  const advanced = new WeakSet()
  const watched = new WeakSet()
  const installedCacheDuration = 60_000
  const numericModPath = /^\d+$/
  const modLink = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
  const modPagePath = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
  const pageVersionPattern = /\d+(?:\.\d+)+/
  const numericFileID = /^\d+$/
  const filePath = /\/files\/(\d+)(?:\/|$)/
  const modeKey = 'mode'
  const markerClass = 'mortar-installed-mod'
  const hiddenClass = 'mortar-hidden-mod'
  const badgeClass = 'mortar-installed-mod-badge'
  const fileBadgeClass = 'mortar-installed-file-badge'
  const panelClass = 'mortar-mod-panel'
  const maxPanelProblems = 5
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
  const mortarGame = () => (pageGame() === 'stardewvalley' ? 'stardew' : '')

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

  const clearFileBadge = () => {
    for (const badge of document.querySelectorAll(`.${fileBadgeClass}`)) {
      badge.remove()
    }
  }

  const fileID = (element) => {
    const value = element.dataset.fileId || element.dataset.fileid
    if (value && numericFileID.test(value)) {
      return Number(value)
    }
    const href = element.getAttribute('href') || ''
    const match = href.match(filePath)
    return match ? Number(match[1]) : undefined
  }

  const markProfileFile = (reply) => {
    clearFileBadge()
    if (new URL(location.href).searchParams.get('tab') !== 'files') {
      return
    }
    const groups = globalThis.mortarFileLabelGroups?.(reply) || []
    if (groups.length === 0) {
      return
    }
    const rows = [
      ...document.querySelectorAll('[data-file-id], [data-fileid], a[href*="/files/"]'),
    ].map((element) => element.closest('tr, li, article, [role="row"]') || element)
    const rowFileID = (candidate) =>
      fileID(candidate) ||
      [...candidate.querySelectorAll('[data-file-id], [data-fileid], a[href]')]
        .map(fileID)
        .find((id) => id !== undefined)
    ensureMarkerStyle()
    const used = new WeakSet()
    for (const group of groups) {
      let matchedRow =
        group.fileId > 0
          ? rows.find((candidate) => !used.has(candidate) && rowFileID(candidate) === group.fileId)
          : undefined
      if (!matchedRow && group.version) {
        matchedRow = rows.find(
          (candidate) => !used.has(candidate) && candidate.textContent?.includes(group.version),
        )
      }
      if (matchedRow && !matchedRow.querySelector(`.${fileBadgeClass}`)) {
        used.add(matchedRow)
        const badge = document.createElement('span')
        badge.className = `${badgeClass} ${fileBadgeClass}`
        badge.append('In ')
        for (let i = 0; i < group.names.length; i += 1) {
          if (i > 0) {
            badge.append(', ')
          }
          const entry = group.names[i]
          if (entry.active) {
            const mark = document.createElement('span')
            mark.className = 'mortar-file-active'
            mark.textContent = entry.name
            badge.append(mark)
          } else {
            badge.append(entry.name)
          }
        }
        matchedRow.prepend(badge)
      }
    }
  }

  // The panel is rendered once per mod page, tab and mode: renders overlap across awaits, and each one changing
  // the page would otherwise wake the observer into another render.
  let panelRendering = false
  let panelKey = ''
  const removePanels = () => {
    for (const el of document.querySelectorAll(`.${panelClass}`)) {
      el.remove()
    }
  }
  const renderModPanel = async () => {
    const id = modPageID()
    if (id === undefined || panelRendering) {
      return
    }
    const key = `${id}|${mode}|${new URL(location.href).searchParams.get('tab') ?? ''}`
    if (key === panelKey && document.querySelector(`.${panelClass}`)) {
      return
    }
    panelRendering = true
    try {
      await drawModPanel(id)
      panelKey = key
    } finally {
      panelRendering = false
    }
  }
  const drawModPanel = async (id) => {
    const selectedMode = await currentMode()
    if (selectedMode === 'off') {
      removePanels()
      return
    }
    const reply = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'mod', game: pageGame(), modId: id }, resolve)
      } catch {
        resolve(undefined)
      }
    })
    markProfileFile(reply)
    const game = mortarGame()
    if (mode !== selectedMode || !reply?.open || game === '') {
      removePanels()
      return
    }
    const lines = globalThis.mortarModPanelLines(
      reply.open,
      reply.others,
      pageVersion(),
      newerVersion,
    )
    const problems = await new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'modProblems', game: pageGame(), modId: id },
          (response) => {
            resolve(Array.isArray(response?.problems) ? response.problems : [])
          },
        )
      } catch {
        resolve([])
      }
    })
    const [existing, ...extra] = document.querySelectorAll(`.${panelClass}`)
    for (const el of extra) {
      el.remove()
    }
    const panel = existing || document.createElement('div')
    panel.className = panelClass
    globalThis.mortarFillPanelLines(panel, lines)
    const link = document.createElement('a')
    link.href = `mortar://${game}/mod/${id}`
    link.textContent = 'Open in Mortar'
    panel.append(link)
    const problemBox = document.createElement('div')
    problemBox.className = 'mortar-mod-problems'
    if (problems.length === 0) {
      problemBox.textContent = `No problems in ${reply.open.profile}`
    } else {
      const problemTitle = document.createElement('div')
      problemTitle.textContent = `Problems in ${reply.open.profile}`
      problemBox.append(problemTitle)
      const list = document.createElement('ul')
      for (const problem of problems.slice(0, maxPanelProblems)) {
        const item = document.createElement('li')
        item.textContent = problem.text
        list.append(item)
      }
      problemBox.append(list)
      if (problems.length > maxPanelProblems) {
        problemBox.append(
          document.createTextNode(
            `+${problems.length - maxPanelProblems} more — open Mortar to see them`,
          ),
        )
      }
    }
    panel.append(problemBox)
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
      .${fileBadgeClass} .mortar-file-active {
        background: #1d1b16;
        border-radius: 2px;
        color: #f0d78c;
        padding: 0 3px;
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
      .${panelClass} .mortar-mod-problems { margin-top: 6px; }
      .${panelClass} .mortar-mod-problems ul { margin: 2px 0 0 18px; padding: 0; }
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
      panelKey = ''
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
    // resolves those itself, so the dialog's own Download link is followed straight away. Requirement rows carry
    // Mod Manager Download links too, so only the link for this page's mod is followed, once per dialog.
    const pageMod = modPageID()
    const dialogs = pageMod === undefined ? [] : [...root.querySelectorAll('[role="dialog"]')]
    for (const dialog of dialogs.filter((d) => !advanced.has(d))) {
      const own = [...dialog.querySelectorAll('a.nxm-button-flamework[href*="nmm=1"]')].find(
        (a) => modID(a.href) === pageMod && !skipped.has(a.href),
      )
      if (own) {
        advanced.add(dialog)
        skipped.add(own.href)
        own.click()
      }
    }
    for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
      if (!sent.has(a.href)) {
        sent.add(a.href)
        chrome.runtime.sendMessage({ link: a.href, close: throwaway() })
        installedCache = { at: 0, ids: new Set() }
        installedRequest = undefined
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

  const scanDelayMs = 150
  const ownSelector = `.${panelClass}, .${badgeClass}, #mortar-installed-mod-style`
  const isOwn = (node) =>
    node instanceof Element
      ? node.closest(ownSelector) !== null
      : Boolean(node.parentElement?.closest(ownSelector))
  // Changes Mortar makes to the page (the panel, badges, its style) never call for another scan.
  const ownMutation = (record) =>
    isOwn(record.target) ||
    ([...record.addedNodes, ...record.removedNodes].length > 0 &&
      [...record.addedNodes, ...record.removedNodes].every(isOwn))

  const watch = (root) => {
    if (watched.has(root)) {
      return
    }
    watched.add(root)
    let pending
    new MutationObserver((records) => {
      if (records.every(ownMutation) || pending !== undefined) {
        return
      }
      pending = setTimeout(() => {
        pending = undefined
        scan(root)
      }, scanDelayMs)
    }).observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href'],
    })
    scan(root)
  }

  watch(document)
}
