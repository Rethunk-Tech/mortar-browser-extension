// Nexus shows the Mod Manager Download link as an nxm:// anchor ("Start download manually") inside the download
// widget's open shadow root. Chromium launches at most one external protocol per user gesture, so in a burst of tabs
// most of the page's own launches are blocked; handing the link to Mortar through native messaging avoids that gate.
// Mutation observers, not a timer, find the link: background tabs throttle timers to as little as once a minute.
// The background script also injects this file into Nexus tabs that were open before the extension loaded, so a
// tab can run it twice; the flag keeps one copy.
if (!globalThis.mortarNxmWatch && typeof chrome !== 'undefined') {
  globalThis.mortarNxmWatch = true
  const sent = new Set()
  const skipped = new Set()
  const advanced = new WeakSet()
  const watched = new WeakSet()
  const installedCacheDuration = 60_000
  const pageVersionPattern = /\d+(?:\.\d+)+/
  const numericFileID = /^\d+$/
  const filePath = /\/files\/(\d+)(?:\/|$)/
  const modeKey = 'mode'
  const markerClass = 'mortar-installed-mod'
  const hiddenClass = 'mortar-hidden-mod'
  const badgeClass = 'mortar-installed-mod-badge'
  const fileBadgeClass = 'mortar-installed-file-badge'
  const panelClass = 'mortar-mod-panel'
  const removedClass = 'mortar-removed-mod'
  const hideControlId = 'mortar-hide-in-profile'
  let mode
  // The Mortar section's checkboxes on mod listings, saved per game.
  const filters = { installed: false, obsolete: false, broken: false }
  let markScheduled = false
  let installedRequest
  const filterState = { game: undefined }
  let lastModReply
  const emptyInstalledCache = () => ({
    ...globalThis.mortarInstalledListingState(undefined, true),
    at: 0,
  })
  let installedCache = emptyInstalledCache()

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

  const pageGame = () => {
    const parts = location.pathname.split('/').filter(Boolean)
    return (parts[0] === 'games' ? parts[1] : parts[0]) || ''
  }

  const isModListing = () => globalThis.mortarIsNexusModListing(location.pathname)

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
    if (installedCache.game === pageGame() && now - installedCache.at < installedCacheDuration) {
      return Promise.resolve(installedCache.ids)
    }
    if (installedRequest) {
      return installedRequest
    }
    const game = pageGame()
    installedRequest = new Promise((resolve) => {
      const settle = (reply, lastError) => {
        const usable = globalThis.mortarInstalledReplyStatus(reply, lastError) === ''
        const ids = usable
          ? new Set(reply.modIds.filter((id) => Number.isInteger(id) && id > 0))
          : undefined
        installedCache = { ...globalThis.mortarInstalledListingState(reply, lastError, ids), game }
        resolve(installedCache.ids)
      }
      try {
        chrome.runtime.sendMessage({ type: 'installed', game }, (reply) => {
          globalThis.mortarSetAccent(reply?.accent)
          settle(reply, chrome.runtime.lastError)
        })
      } catch {
        settle(undefined, true)
      }
    }).finally(() => {
      installedRequest = undefined
    })
    return installedRequest
  }

  const modPageID = () => globalThis.mortarNexusModID(location.pathname)

  const isFilesTab = () => new URL(location.href).searchParams.get('tab') === 'files'

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
    if (!isFilesTab()) {
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
        const badge = globalThis.mortarFileBadge(document, group, `${badgeClass} ${fileBadgeClass}`)
        // A span directly inside a <tr> becomes an anonymous cell and shifts the columns.
        const cell = matchedRow.matches('tr') ? matchedRow.querySelector('td, th') : undefined
        ;(cell || matchedRow).prepend(badge)
      }
    }
  }

  // The panel is rendered once per mod page, tab and mode: renders overlap across awaits, and each one changing
  // the page would otherwise wake the observer into another render.
  let panelRendering = false
  let panelKey = ''
  const removePanel = (el) => {
    el._mortarMenu?.disconnect()
    el.remove()
  }
  const removePanels = () => {
    for (const el of document.querySelectorAll(`.${panelClass}`)) {
      removePanel(el)
    }
  }
  const renderModPanel = async () => {
    const id = modPageID()
    if (id === undefined) {
      if (panelKey) {
        removePanels()
        clearFileBadge()
        panelKey = ''
        lastModReply = undefined
      }
      return
    }
    if (panelRendering) {
      return
    }
    const key = `${id}|${mode}|${new URL(location.href).searchParams.get('tab') ?? ''}`
    if (key === panelKey && document.querySelector(`.${panelClass}`)) {
      // Nexus draws the file rows after the tab opens, so the labels are retried until one lands.
      if (isFilesTab() && !document.querySelector(`.${fileBadgeClass}`)) {
        markProfileFile(lastModReply)
      }
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
        chrome.runtime.sendMessage({ type: 'mod', game: pageGame(), modId: id }, (response) =>
          resolve(chrome.runtime.lastError ? undefined : response),
        )
      } catch {
        resolve(undefined)
      }
    })
    globalThis.mortarSetAccent(reply?.accent)
    const state = globalThis.mortarConnectionState(reply)
    const game = pageGame()
    const supported = globalThis.mortarSupportedGames(reply).includes(pageGame())
    if (mode !== selectedMode || game === '' || !supported || state === 'off') {
      removePanels()
      clearFileBadge()
      return
    }
    lastModReply = state === 'ready' ? reply : undefined
    markProfileFile(lastModReply)
    const [existing, ...extra] = document.querySelectorAll(`.${panelClass}`)
    for (const el of extra) {
      removePanel(el)
    }
    const panel = existing || document.createElement('div')
    panel.className = panelClass
    const data = globalThis.mortarMenuModData(
      { ...reply, state },
      reply?.open?.pageVersion || pageVersion(),
    )
    data.requirements = Array.isArray(reply?.requirements) ? reply.requirements : []
    data.game = pageGame()
    globalThis.mortarAttachMenu(panel, data, {
      onOpen: () => {
        const link = document.createElement('a')
        link.href = `mortar://${game}/mod/${id}`
        link.click()
      },
    })
    if (!existing) {
      const title = document.querySelector('h1')
      title?.parentElement?.insertBefore(panel, title.nextSibling)
    }
  }

  const renderCollectionPanel = () =>
    globalThis.mortarRenderCollectionPanel(document, location.pathname, {
      panelClass,
      collectionPanelClass: 'mortar-collection-panel',
      currentMode,
      ensureMarkerStyle,
      installedIDs,
      installedCache: () => installedCache,
      unavailable: async () => {
        await installedIDs()
        return installedCache.state === 'off' || !installedCache.games.includes(pageGame())
      },
    })

  const ensureMarkerStyle = () =>
    globalThis.mortarEnsureInstalledModStyle(document, {
      markerClass,
      badgeClass,
      fileBadgeClass,
      hiddenClass,
      removedClass,
      ...globalThis.mortarDimClasses,
      panelClass,
    })

  const modID = (href) => {
    try {
      const url = new URL(href, location.href)
      if (url.origin !== location.origin || url.pathname.split('/')[1] !== pageGame()) {
        return
      }
      return globalThis.mortarNexusModID(url.pathname)
    } catch {
      return
    }
  }

  const tileFor = (link) => link.closest(globalThis.mortarTileSelector)
  const listingMarkCtx = () => ({
    document,
    isModListing,
    hideControlId,
    currentMode,
    pageGame,
    storage: chrome.storage?.local,
    installedIDs,
    installedCache: () => installedCache,
    mode: () => mode,
    filters,
    filterState,
    modID,
    tileFor,
    ensureMarkerStyle,
    markerClass,
    hiddenClass,
    removedClass,
    badgeClass,
    onHideChange: (row, checked) => {
      filters[row] = checked
      globalThis.mortarWriteListingFilter(chrome.storage?.local, pageGame(), row, checked)
      requestMark()
    },
  })

  const markInstalled = () => globalThis.mortarMarkInstalledListing(listingMarkCtx())

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
    if (area !== 'local') {
      return
    }
    if (globalThis.mortarApplyFilterChanges(changes, pageGame(), filters)) {
      requestMark()
    }
    if (changes[modeKey]) {
      mode =
        changes[modeKey].newValue === 'hide' || changes[modeKey].newValue === 'off'
          ? changes[modeKey].newValue
          : 'highlight'
      requestMark()
      panelKey = ''
      renderModPanel().catch(() => false)
      renderCollectionPanel().catch(() => false)
    }
  })

  // Only a Mortar that can take the link gets it: without one the dialog's requirement list stays for the user.
  const advanceDialogs = async (root) => {
    const pageMod = modPageID()
    const dialogs = pageMod === undefined ? [] : [...root.querySelectorAll('[role="dialog"]')]
    for (const dialog of dialogs.filter((d) => !advanced.has(d))) {
      const own = [...dialog.querySelectorAll('a.nxm-button-flamework[href*="nmm=1"]')].find(
        (a) =>
          new URL(a.href, location.href).origin === location.origin &&
          globalThis.mortarIsOwnDialogDownload(new URL(a.href, location.href), pageMod) &&
          !skipped.has(a.href),
      )
      if (own) {
        await installedIDs()
        // The dialog may have been handled, or Mortar found missing or off, while the installed list loaded.
        if (!(advanced.has(dialog) || ['missing', 'off'].includes(installedCache.state))) {
          advanced.add(dialog)
          skipped.add(own.href)
          own.click()
        }
      }
    }
  }

  // A copy left in an open tab when the extension is reloaded or removed loses chrome.runtime; the new copy takes
  // over, so the old one stays quiet.
  const scan = (root) => {
    if (!chrome.runtime?.id) {
      return
    }
    // Mod manager download first opens a "Download mod file" dialog listing the file's requirements. Mortar
    // resolves those itself, so the dialog's own Download link is followed straight away, once per dialog.
    advanceDialogs(root).catch(() => false)
    for (const a of root.querySelectorAll('a[href^="nxm://"]')) {
      if (!sent.has(a.href)) {
        sent.add(a.href)
        chrome.runtime.sendMessage({ link: a.href, close: throwaway() })
        installedCache = emptyInstalledCache()
        installedRequest = undefined
      }
    }
    requestMark()
    renderModPanel().catch(() => false)
    renderCollectionPanel().catch(() => false)
  }

  const scanDelayMs = 150
  const ownSelector = `.${panelClass}, .${badgeClass}, #mortar-installed-mod-style, .mortar-collection-status, #${hideControlId}`
  const isOwn = (node) =>
    node instanceof Element
      ? node.closest(ownSelector) !== null
      : Boolean(node.parentElement?.closest(ownSelector))
  // Changes Mortar makes to the page (the panel, badges, its style) never call for another scan.
  const ownMutation = (record) =>
    isOwn(record.target) ||
    ([...record.addedNodes, ...record.removedNodes].length > 0 &&
      [...record.addedNodes, ...record.removedNodes].every(isOwn))

  // Shadow roots are looked for when a node arrives, not on every scan; Mortar's own hosts are never watched, since
  // the panel's changes inside its root would otherwise schedule scans that redraw it.
  const watchShadows = (node) => {
    const hosts = [node, ...(node.querySelectorAll?.('*') ?? [])]
    for (const el of hosts) {
      if (el.shadowRoot && !el.matches(ownSelector)) {
        watch(el.shadowRoot)
      }
    }
  }

  const watch = (root) => {
    if (watched.has(root)) {
      return
    }
    watched.add(root)
    let pending
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && !isOwn(node)) {
            watchShadows(node)
          }
        }
      }
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
    watchShadows(root)
    scan(root)
  }

  // Mortar's profile, installed mods and Appearance setting change while the tab is in the background, so coming
  // back re-reads all of it.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      installedCache = emptyInstalledCache()
      panelKey = ''
      requestMark()
      renderModPanel().catch(() => false)
      renderCollectionPanel().catch(() => false)
    }
  })
  watch(document)
}
