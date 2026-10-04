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

globalThis.mortarFindNexusFilterSidebar = (root, hideControlId) => {
  const boxes = [...root.querySelectorAll('input[type="checkbox"]')].filter(
    (box) => !box.closest(`#${hideControlId}`),
  )
  for (const box of boxes) {
    const sidebar = box.closest('aside')
    if (sidebar) {
      return sidebar
    }
  }
  for (const box of boxes) {
    const sidebar = box.closest(
      '[class*="Filter"], [class*="filter"], [data-testid*="filter"], [data-testid*="Filter"]',
    )
    if (sidebar) {
      return sidebar
    }
  }
}

globalThis.mortarEnsureHideInProfileControl = (root, hideControlId, onChange) => {
  const sidebar = globalThis.mortarFindNexusFilterSidebar(root, hideControlId)
  if (!sidebar) {
    return
  }
  let wrap = root.getElementById(hideControlId)
  if (!wrap) {
    const template = [...sidebar.querySelectorAll('label')].find(
      (el) => el.querySelector('input[type="checkbox"]') && el.id !== hideControlId,
    )
    wrap = root.createElement(template?.tagName || 'label')
    wrap.id = hideControlId
    if (template) {
      wrap.className = template.className
    }
    const input = root.createElement('input')
    input.type = 'checkbox'
    input.id = `${hideControlId}-input`
    const tmplInput = template?.querySelector('input[type="checkbox"]')
    if (tmplInput) {
      input.className = tmplInput.className
    }
    const text = root.createElement('span')
    const tmplText = [...(template?.querySelectorAll('span') || [])].find((el) =>
      el.textContent?.trim(),
    )
    if (tmplText) {
      text.className = tmplText.className
    }
    text.append('Hide mods in this profile ')
    const count = root.createElement('span')
    count.dataset.mortarHideCount = 'true'
    wrap.append(input, text, count)
    if (wrap.tagName === 'LABEL') {
      wrap.htmlFor = input.id
    }
    if (template?.parentElement) {
      template.parentElement.insertBefore(wrap, template)
    } else {
      sidebar.prepend(wrap)
    }
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
