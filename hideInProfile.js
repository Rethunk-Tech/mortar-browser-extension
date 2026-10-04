globalThis.mortarHideInProfileStorageKey = (game) => `hideModsInProfile:${game}`
globalThis.mortarGrayObsoleteStorageKey = (game) => `grayObsoleteMods:${game}`
// The classes that dim listing tiles for the obsolete and broken rows.
globalThis.mortarDimClasses = {
  obsoleteClass: 'mortar-obsolete-mod',
  brokenClass: 'mortar-broken-mod',
}

// Each listing filter row's storage key, saved per game.
globalThis.mortarFilterKeys = {
  installed: globalThis.mortarHideInProfileStorageKey,
  obsolete: globalThis.mortarGrayObsoleteStorageKey,
  broken: (game) => `grayBrokenMods:${game}`,
}

// The words Mortar's Problems check reads as an author marking a mod dead (authorStatusWord in
// internal/problems/author_marked.go; a Go test keeps the two lists equal).
globalThis.mortarObsoleteWord = /\b(obsolete|deprecated|depreciated)\b/i
const mortarSentenceEnd = /[.!?]/

// Same rule as Mortar's statusMatch: the word counts anywhere in a mod's name, but in a summary only where it speaks
// for the mod itself (at the start, "This mod/file ...", or a heading line), so "replaces the obsolete X" is not a hit.
globalThis.mortarObsoleteText = (title, summary) => {
  if (globalThis.mortarObsoleteWord.test(title || '')) {
    return true
  }
  const text = summary || ''
  const match = globalThis.mortarObsoleteWord.exec(text)
  if (!match) {
    return false
  }
  const prefix = text.slice(0, match.index).trim().toLowerCase()
  if (prefix === '' || prefix.startsWith('this mod') || prefix.startsWith('this file')) {
    return true
  }
  const line = text.slice(text.lastIndexOf('\n', match.index) + 1).trim()
  return (
    line.startsWith('#') ||
    (line !== '' && line.toUpperCase() === line && !mortarSentenceEnd.test(line))
  )
}

globalThis.mortarHideInProfileControl = ({ connected, profileOpen, enabled, status }) => {
  if (!connected) {
    return { disabled: true, hide: false, title: status || "Mortar isn't running" }
  }
  if (!profileOpen) {
    return { disabled: true, hide: false, title: 'Open a profile in Mortar' }
  }
  return { disabled: false, hide: enabled === true, title: '' }
}

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

// The section goes right after the "Hide filters" block, before Nexus's first filter section. Each row is a
// Headless-UI-shaped checkbox; onChange gets the row ('installed' or 'obsolete') and the new value.
const mortarFilterRows = [
  {
    key: 'installed',
    label: 'Gray out mods in profile',
    hint: 'Dims mods that are in the profile open in Mortar; hover one to see it clearly',
  },
  {
    key: 'obsolete',
    label: 'Gray out obsolete',
    hint: 'Dims mods whose name or summary says obsolete, deprecated or depreciated',
  },
  {
    key: 'broken',
    label: 'Gray out broken',
    hint: "Dims mods SMAPI's compatibility list marks broken for the game version you last played",
  },
]

// Listeners belong to one content-script copy, so bound rows are tracked per copy, not on the shared DOM.
const mortarBoundRows = new WeakSet()

const mortarBindFilterRow = (row, onChange) => {
  const box = row.querySelector('[role="checkbox"]')
  if (!box || mortarBoundRows.has(row)) {
    return
  }
  mortarBoundRows.add(row)
  const toggle = () => {
    if (box.getAttribute('aria-disabled') !== 'true') {
      onChange(row.dataset.mortarRow, box.getAttribute('aria-checked') !== 'true')
    }
  }
  row.addEventListener('click', toggle)
  box.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      toggle()
    }
  })
}

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
    const svgNS = 'http://www.w3.org/2000/svg'
    const makeRow = ({ key, label: name, hint }) => {
      const row = el('div', c.row)
      row.dataset.mortarRow = key
      row.dataset.mortarHint = hint
      const checkbox = el('span', `${c.box} ${c.boxOff}`)
      checkbox.setAttribute('role', 'checkbox')
      checkbox.setAttribute('aria-checked', 'false')
      checkbox.tabIndex = 0
      const tick = root.createElementNS(svgNS, 'svg')
      tick.setAttribute('viewBox', '0 0 24 24')
      tick.setAttribute('role', 'presentation')
      tick.setAttribute('class', `${c.tick} opacity-0`)
      const path = root.createElementNS(svgNS, 'path')
      path.setAttribute('d', mortarTickPath)
      tick.append(path)
      checkbox.append(tick)
      const label = el('label', c.label)
      label.id = `${hideControlId}-${key}-label`
      checkbox.setAttribute('aria-labelledby', label.id)
      const text = el('p', c.text)
      const count = el('span', c.count)
      count.dataset.mortarCount = 'true'
      text.append(el('span', c.name, name), count)
      label.append(text)
      const reason = el('p', c.count)
      reason.dataset.mortarReason = 'true'
      reason.hidden = true
      label.append(reason)
      row.append(checkbox, label)
      return row
    }
    wrap = el('div')
    wrap.id = hideControlId
    const header = el('div', c.header)
    header.append(el('span', c.title, 'Mortar'))
    const rows = el('div', 'space-y-2')
    rows.append(...mortarFilterRows.map(makeRow))
    const status = el('p', c.count)
    status.dataset.mortarStatus = 'true'
    status.hidden = true
    const body = el('div', c.body)
    body.append(status, rows)
    wrap.append(header, body)
    const firstSection = [...sidebar.children].find((child) => child.matches('button'))
    sidebar.insertBefore(wrap, firstSection || null)
  }
  for (const row of wrap.querySelectorAll('[data-mortar-row]')) {
    mortarBindFilterRow(row, onChange)
  }
  return wrap
}

const mortarSyncFilterRow = (row, { checked, disabled, title, count, removed }) => {
  if (!row) {
    return
  }
  const c = mortarFilterClasses
  const box = row.querySelector('[role="checkbox"]')
  if (box) {
    box.setAttribute('aria-checked', checked ? 'true' : 'false')
    box.className = `${c.box} ${checked ? c.boxOn : c.boxOff}`
    box.toggleAttribute('data-checked', checked)
    box.setAttribute('aria-disabled', disabled ? 'true' : 'false')
    box
      .querySelector('svg')
      ?.setAttribute('class', `${c.tick} ${checked ? 'opacity-100' : 'opacity-0'}`)
  }
  row.toggleAttribute('data-disabled', disabled)
  row.title = title || row.dataset.mortarHint || ''
  const reason = row.querySelector('[data-mortar-reason]')
  if (reason) {
    const text = disabled ? title || '' : ''
    reason.textContent = text
    reason.hidden = text === ''
  }
  const label = row.querySelector('[data-mortar-count]')
  if (label) {
    const text = removed ? `(${count} hidden)` : globalThis.mortarHiddenModsCountLabel(count)
    label.textContent = count > 0 ? text : ''
  }
}

// controlState is the installed row's state; rows holds { enabled, count, disabled, title } for the other rows.
globalThis.mortarSyncHideInProfileControl = (wrap, controlState, hiddenCount, rows = {}) => {
  if (!wrap) {
    return
  }
  const line = wrap.querySelector('[data-mortar-status]')
  const status = controlState.status ?? ''
  if (line && line.textContent !== status) {
    line.textContent = status
    line.hidden = status === ''
  }
  mortarSyncFilterRow(wrap.querySelector('[data-mortar-row="installed"]'), {
    checked: controlState.hide,
    disabled: controlState.disabled,
    title: controlState.title,
    count: hiddenCount,
    removed: controlState.removed === true,
  })
  for (const [key, row] of Object.entries(rows)) {
    mortarSyncFilterRow(wrap.querySelector(`[data-mortar-row="${key}"]`), {
      checked: row.enabled === true && row.disabled !== true,
      disabled: row.disabled === true,
      title: row.title || '',
      count: row.count ?? 0,
    })
  }
}

// Dims every listing tile that dim(tile) picks while enabled, and returns how many it dimmed.
globalThis.mortarApplyDimMarks = ({ root, enabled, dimClass, dim }) => {
  let count = 0
  for (const tile of root.querySelectorAll(globalThis.mortarTileSelector)) {
    const on = enabled && dim(tile)
    tile.classList.toggle(dimClass, on)
    if (on) {
      count += 1
    }
  }
  return count
}

// Falls back to the tile's first mod link when Nexus renames its title attribute.
globalThis.mortarTileTitleLink = (tile) =>
  tile.querySelector('[data-e2eid="mod-tile-title"]') || tile.querySelector('a[href*="/mods/"]')

globalThis.mortarTileObsolete = (tile) =>
  globalThis.mortarObsoleteText(
    globalThis.mortarTileTitleLink(tile)?.textContent || '',
    (tile.querySelector('[data-e2eid="mod-tile-summary"]') || tile).textContent || '',
  )

globalThis.mortarReadHideInProfile = (
  storage,
  game,
  keyFor = globalThis.mortarHideInProfileStorageKey,
) =>
  new Promise((resolve) => {
    if (!(game && storage)) {
      resolve(false)
      return
    }
    const key = keyFor(game)
    try {
      storage.get({ [key]: false }, (result) => {
        resolve(result?.[key] === true)
      })
    } catch {
      resolve(false)
    }
  })

globalThis.mortarWriteHideInProfile = (
  storage,
  game,
  value,
  keyFor = globalThis.mortarHideInProfileStorageKey,
) => {
  if (!(game && storage)) {
    return
  }
  try {
    storage.set({ [keyFor(game)]: value === true })
  } catch {
    // Storage is unavailable in this tab; the checkbox still applies until reload.
  }
}

// Saves one listing filter row for the page's game.
globalThis.mortarWriteListingFilter = (storage, game, row, checked) =>
  globalThis.mortarWriteHideInProfile(storage, game, checked, globalThis.mortarFilterKeys[row])

// Copies another tab's change to a listing filter into filters; true when one changed.
globalThis.mortarApplyFilterChanges = (changes, game, filters) => {
  let changed = false
  for (const [row, keyFor] of Object.entries(globalThis.mortarFilterKeys)) {
    const change = changes[keyFor(game)]
    if (change) {
      filters[row] = change.newValue === true
      changed = true
    }
  }
  return changed
}

globalThis.mortarInstalledListingState = (reply, lastError, ids) => {
  const nativeFail = Boolean(lastError) || reply?.nativeMessagingError === true
  const connected = !nativeFail && reply?.connected === true
  return {
    at: Date.now(),
    ids: ids || new Set(),
    broken: new Set(Array.isArray(reply?.brokenIds) ? reply.brokenIds : []),
    nativeFail,
    connected,
    profileOpen: connected && reply?.profile !== '',
    profile: typeof reply?.profile === 'string' ? reply.profile : '',
    updates: new Set(Array.isArray(reply?.updateIds) ? reply.updateIds : []),
    games: globalThis.mortarSupportedGames(reply),
    state: globalThis.mortarConnectionState(reply, lastError),
    status: globalThis.mortarInstalledReplyStatus(reply, lastError),
  }
}
