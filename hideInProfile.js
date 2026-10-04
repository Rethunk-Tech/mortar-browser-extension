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

globalThis.mortarHiddenModsCountLabel = (count) => `(${count})`

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

// Nexus's own classes, read from its listing sidebar, so the control looks like a filter section with one checkbox.
const mortarFilterClasses = {
  header:
    'group/filter flex w-full items-center gap-x-2 border-t border-stroke-subdued py-3 text-left',
  title:
    'text-title-sm text-neutral-moderate grow transition-colors group-hover/filter:text-neutral-strong',
  body: 'block pt-2 pb-6',
  row: 'group/checkbox flex gap-x-2 cursor-pointer data-disabled:cursor-not-allowed data-disabled:opacity-40 w-full',
  box: 'relative flex size-5 shrink-0 items-center justify-center rounded border text-neutral-inverted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-subdued border-stroke-strong/60',
  boxOff: 'bg-surface-low group-[:not([data-disabled]):hover]/checkbox:bg-surface-translucent-low',
  boxOn: 'bg-neutral-strong',
  tick: 'shrink-0 absolute transition-opacity',
  label:
    'min-w-0 grow cursor-pointer text-left leading-none group-data-disabled/checkbox:cursor-not-allowed',
  text: 'text-body-md flex gap-x-1',
  name: 'truncate text-neutral-moderate transition-colors group-hover/checkbox:text-neutral-strong',
  count: 'shrink-0 text-neutral-subdued',
}
const mortarTickPath = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z'

// The section goes right after the "Hide filters" block, before Nexus's first filter section.
globalThis.mortarEnsureHideInProfileControl = (root, hideControlId, onChange) => {
  const sidebar = globalThis.mortarFindNexusFilterSidebar(root, hideControlId)
  if (!sidebar) {
    return
  }
  let wrap = root.getElementById(hideControlId)
  if (!wrap) {
    const c = mortarFilterClasses
    const el = (tag, className, content) => {
      const node = root.createElement(tag)
      if (className) {
        node.className = className
      }
      if (content) {
        node.textContent = content
      }
      return node
    }
    wrap = el('div')
    wrap.id = hideControlId
    const header = el('div', c.header)
    header.append(el('span', c.title, 'Mortar'))
    const row = el('div', c.row)
    const checkbox = el('span', `${c.box} ${c.boxOff}`)
    checkbox.setAttribute('role', 'checkbox')
    checkbox.setAttribute('aria-checked', 'false')
    checkbox.tabIndex = 0
    checkbox.id = `${hideControlId}-box`
    const svgNS = 'http://www.w3.org/2000/svg'
    const tick = root.createElementNS(svgNS, 'svg')
    tick.setAttribute('viewBox', '0 0 24 24')
    tick.setAttribute('role', 'presentation')
    tick.setAttribute('class', `${c.tick} opacity-0`)
    const path = root.createElementNS(svgNS, 'path')
    path.setAttribute('d', mortarTickPath)
    tick.append(path)
    checkbox.append(tick)
    const label = el('label', c.label)
    label.id = `${hideControlId}-label`
    checkbox.setAttribute('aria-labelledby', label.id)
    const text = el('p', c.text)
    const count = el('span', c.count)
    count.dataset.mortarHideCount = 'true'
    text.append(el('span', c.name, 'Hide installed'), count)
    wrap.dataset.mortarHint = 'Hides mods that are in the profile open in Mortar'
    label.append(text)
    row.append(checkbox, label)
    const body = el('div', c.body)
    body.append(row)
    wrap.append(header, body)
    const firstSection = [...sidebar.children].find((child) => child.matches('button'))
    sidebar.insertBefore(wrap, firstSection || null)
  }
  const box = wrap.querySelector('[role="checkbox"]')
  if (box && box.dataset.mortarBound !== 'true') {
    box.dataset.mortarBound = 'true'
    const toggle = () => {
      if (box.getAttribute('aria-disabled') !== 'true') {
        onChange(box.getAttribute('aria-checked') !== 'true')
      }
    }
    wrap.querySelector('[class*="group/checkbox"]').addEventListener('click', toggle)
    box.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        toggle()
      }
    })
  }
  return wrap
}

globalThis.mortarSyncHideInProfileControl = (wrap, controlState, hiddenCount) => {
  if (!wrap) {
    return
  }
  const c = mortarFilterClasses
  const row = wrap.querySelector('[class*="group/checkbox"]')
  const box = wrap.querySelector('[role="checkbox"]')
  if (box) {
    box.setAttribute('aria-checked', controlState.hide ? 'true' : 'false')
    box.className = `${c.box} ${controlState.hide ? c.boxOn : c.boxOff}`
    box.toggleAttribute('data-checked', controlState.hide)
    box.setAttribute('aria-disabled', controlState.disabled ? 'true' : 'false')
    box
      .querySelector('svg')
      ?.setAttribute('class', `${c.tick} ${controlState.hide ? 'opacity-100' : 'opacity-0'}`)
  }
  row?.toggleAttribute('data-disabled', controlState.disabled)
  wrap.title = controlState.title || wrap.dataset.mortarHint || ''
  const count = wrap.querySelector('[data-mortar-hide-count]')
  if (count) {
    count.textContent = hiddenCount > 0 ? globalThis.mortarHiddenModsCountLabel(hiddenCount) : ''
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
