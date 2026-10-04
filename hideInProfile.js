globalThis.mortarHideInProfileStorageKey = (game) => `hideModsInProfile:${game}`

globalThis.mortarHideInProfileControl = ({ connected, profileOpen, enabled }) => {
  if (!connected) {
    return { disabled: true, hide: false, title: 'Mortar is not connected' }
  }
  if (!profileOpen) {
    return { disabled: true, hide: false, title: 'No profile is open' }
  }
  return { disabled: false, hide: enabled === true, title: '' }
}

globalThis.mortarListingTileHidden = (installed, hide) => installed === true && hide === true

globalThis.mortarHiddenModsCountLabel = (count) => `(${count} hidden)`

// Nexus's listing sidebar is #filters-panel; its checkboxes are Headless UI buttons with role="checkbox", not inputs.
globalThis.mortarFindNexusFilterSidebar = (root, hideControlId) => {
  const panel = root.getElementById('filters-panel')
  if (panel) {
    return panel
  }
  const box = [...root.querySelectorAll('[role="checkbox"], input[type="checkbox"]')].find(
    (el) => !el.closest(`#${hideControlId}`),
  )
  return box?.closest('[role="region"], aside') || undefined
}

// The control is Mortar's own section at the top of the sidebar: Nexus's checkboxes are script-driven buttons, so a
// native checkbox is used and styled to sit with them.
globalThis.mortarEnsureHideInProfileControl = (root, hideControlId, onChange) => {
  const sidebar = globalThis.mortarFindNexusFilterSidebar(root, hideControlId)
  if (!sidebar) {
    return
  }
  let wrap = root.getElementById(hideControlId)
  if (!wrap) {
    wrap = root.createElement('div')
    wrap.id = hideControlId
    wrap.style.cssText =
      'padding: 8px 0 12px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);'
    const heading = root.createElement('p')
    heading.textContent = 'Mortar'
    heading.style.cssText =
      'margin: 0 0 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8;'
    const label = root.createElement('label')
    label.style.cssText =
      'display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;'
    const input = root.createElement('input')
    input.type = 'checkbox'
    input.id = `${hideControlId}-input`
    input.style.cssText =
      'width: 16px; height: 16px; margin: 0; accent-color: #d98f40; cursor: pointer;'
    const text = root.createElement('span')
    text.append('Hide mods in this profile ')
    const count = root.createElement('span')
    count.dataset.mortarHideCount = 'true'
    count.style.opacity = '0.7'
    label.append(input, text, count)
    wrap.append(heading, label)
    sidebar.prepend(wrap)
  }
  const input = wrap.querySelector('input[type="checkbox"]')
  if (input && input.dataset.mortarBound !== 'true') {
    input.dataset.mortarBound = 'true'
    input.addEventListener('change', () => {
      onChange(input.checked)
    })
  }
  return wrap
}

globalThis.mortarSyncHideInProfileControl = (wrap, controlState, hiddenCount) => {
  if (!wrap) {
    return
  }
  const input = wrap.querySelector('input[type="checkbox"]')
  if (input) {
    input.disabled = controlState.disabled
    input.checked = controlState.hide
    input.title = controlState.title
  }
  wrap.title = controlState.title
  const count = wrap.querySelector('[data-mortar-hide-count]')
  if (count) {
    count.textContent = globalThis.mortarHiddenModsCountLabel(hiddenCount)
  }
}

globalThis.mortarReadHideInProfile = (storage, game) =>
  new Promise((resolve) => {
    if (!(game && storage)) {
      resolve(false)
      return
    }
    const key = globalThis.mortarHideInProfileStorageKey(game)
    try {
      storage.get({ [key]: false }, (result) => {
        resolve(result?.[key] === true)
      })
    } catch {
      resolve(false)
    }
  })

globalThis.mortarWriteHideInProfile = (storage, game, value) => {
  if (!(game && storage)) {
    return
  }
  try {
    storage.set({ [globalThis.mortarHideInProfileStorageKey(game)]: value === true })
  } catch {
    // Storage is unavailable in this tab; the checkbox still applies until reload.
  }
}

globalThis.mortarInstalledListingState = (reply, lastError, ids) => {
  const nativeFail = Boolean(lastError) || reply?.nativeMessagingError === true
  const connected = !nativeFail && reply?.connected === true
  return {
    at: Date.now(),
    ids: ids || new Set(),
    connected,
    profileOpen: connected && reply?.profile !== '',
  }
}

globalThis.mortarApplyListingHideMarks = ({
  document,
  tiles,
  hideTiles,
  markerClass,
  hiddenClass,
  badgeClass,
  showBadge,
}) => {
  for (const tile of tiles) {
    tile.classList.add(markerClass)
    if (globalThis.mortarListingTileHidden(true, hideTiles)) {
      tile.classList.add(hiddenClass)
      tile.querySelector(`.${badgeClass}`)?.remove()
    } else {
      tile.classList.remove(hiddenClass)
      if (showBadge && !tile.querySelector(`.${badgeClass}`)) {
        const badge = document.createElement('span')
        badge.className = badgeClass
        badge.textContent = 'In profile'
        tile.prepend(badge)
      }
    }
  }
}

globalThis.mortarMarkInstalledListing = async (ctx) => {
  if (!ctx.isModListing()) {
    ctx.document.getElementById(ctx.hideControlId)?.remove()
    return
  }
  const selectedMode = await ctx.currentMode()
  ctx.setHideInProfile(await globalThis.mortarReadHideInProfile(ctx.storage, ctx.pageGame()))
  const ids = await ctx.installedIDs()
  if (ctx.mode() !== selectedMode) {
    return
  }
  const cache = ctx.installedCache()
  const control = globalThis.mortarHideInProfileControl({
    connected: cache.connected,
    profileOpen: cache.profileOpen,
    enabled: ctx.hideInProfile(),
  })
  const hideTiles = control.hide || selectedMode === 'hide'
  const tiles = globalThis.mortarCollectInstalledTiles({
    root: ctx.document,
    ids,
    modID: ctx.modID,
    tileFor: ctx.tileFor,
  })
  ctx.ensureMarkerStyle()
  globalThis.mortarClearUnlistedMarks({
    root: ctx.document,
    tiles,
    markerClass: ctx.markerClass,
    hiddenClass: ctx.hiddenClass,
    badgeClass: ctx.badgeClass,
  })
  globalThis.mortarApplyListingHideMarks({
    document: ctx.document,
    tiles,
    hideTiles,
    markerClass: ctx.markerClass,
    hiddenClass: ctx.hiddenClass,
    badgeClass: ctx.badgeClass,
    showBadge: selectedMode !== 'off',
  })
  globalThis.mortarSyncHideInProfileControl(
    globalThis.mortarEnsureHideInProfileControl(ctx.document, ctx.hideControlId, ctx.onHideChange),
    control,
    ctx.document.querySelectorAll(`.${ctx.hiddenClass}`).length,
  )
}

globalThis.mortarCollectInstalledTiles = ({ root, ids, modID, tileFor }) => {
  const tiles = new Set()
  for (const link of root.querySelectorAll('a[href]')) {
    const id = modID(link.href)
    if (id !== undefined && ids.has(id)) {
      tiles.add(tileFor(link))
    }
  }
  return tiles
}

globalThis.mortarClearUnlistedMarks = ({ root, tiles, markerClass, hiddenClass, badgeClass }) => {
  for (const tile of root.querySelectorAll(`.${markerClass}, .${hiddenClass}`)) {
    if (!tiles.has(tile)) {
      tile.classList.remove(markerClass, hiddenClass)
      tile.querySelector(`.${badgeClass}`)?.remove()
    }
  }
}
