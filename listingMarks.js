// Every mark Mortar put on listing tiles: Off draws nothing.
globalThis.mortarClearListingMarks = (ctx) => {
  const { obsoleteClass, brokenClass } = globalThis.mortarDimClasses
  const classes = [ctx.markerClass, ctx.hiddenClass, ctx.removedClass, obsoleteClass, brokenClass]
  for (const tile of ctx.document.querySelectorAll(classes.map((c) => `.${c}`).join(', '))) {
    tile.classList.remove(...classes)
    tile.querySelector(`.${ctx.badgeClass}`)?.remove()
  }
}

const mortarSyncTileBadge = (document, tile, { badgeClass, update }) => {
  const label = update ? 'Update available' : 'In profile'
  let badge = tile.querySelector(`.${badgeClass}`)
  if (!badge) {
    badge = document.createElement('span')
    badge.className = badgeClass
    tile.prepend(badge)
  }
  if (badge.textContent !== label) {
    badge.textContent = label
  }
  badge.classList.toggle(`${badgeClass}-update`, update)
}

// tiles maps each matched tile to its mod id. In Hide mode a tile leaves the page; otherwise it is outlined, and
// grayed when the "Gray out mods in profile" row is on.
globalThis.mortarApplyListingHideMarks = ({
  document,
  tiles,
  gray,
  remove,
  updates,
  showUpdates = true,
  markerClass,
  hiddenClass,
  removedClass,
  badgeClass,
}) => {
  for (const [tile, id] of tiles) {
    // A mod with an update stays readable under Gray out, so the badge that names the update is not dimmed away.
    const update = showUpdates && updates.has(id)
    const grayed = gray && !remove && !update
    tile.classList.toggle(removedClass, remove)
    tile.classList.toggle(markerClass, !remove)
    tile.classList.toggle(hiddenClass, grayed)
    if (remove || grayed) {
      tile.querySelector(`.${badgeClass}`)?.remove()
    } else {
      mortarSyncTileBadge(document, tile, { badgeClass, update })
    }
  }
}

const mortarListingOff = (ctx) => {
  ctx.document.getElementById(ctx.hideControlId)?.remove()
  globalThis.mortarClearListingMarks(ctx)
}

globalThis.mortarMarkInstalledListing = async (ctx) => {
  if (!ctx.isModListing()) {
    mortarListingOff(ctx)
    return
  }
  const selectedMode = await ctx.currentMode()
  if (selectedMode === 'off') {
    mortarListingOff(ctx)
    return
  }
  ctx.applySettings(await ctx.settings())
  const ids = await ctx.installedIDs()
  if (ctx.mode() !== selectedMode) {
    return
  }
  const cache = ctx.installedCache()
  if (cache.state === 'off' || !cache.games.includes(ctx.pageGame())) {
    mortarListingOff(ctx)
    return
  }
  const removing = selectedMode === 'hide'
  const control = removing
    ? {
        disabled: true,
        hide: false,
        removed: true,
        title: 'Installed mods are hidden; change this in the extension options',
      }
    : globalThis.mortarHideInProfileControl({
        connected: cache.connected,
        profileOpen: cache.profileOpen,
        enabled: ctx.filters.installed,
        status: cache.status,
      })
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
    removedClass: ctx.removedClass,
    badgeClass: ctx.badgeClass,
  })
  globalThis.mortarApplyListingHideMarks({
    document: ctx.document,
    tiles,
    gray: control.hide,
    remove: removing,
    updates: cache.updates,
    showUpdates: ctx.showUpdates(),
    markerClass: ctx.markerClass,
    hiddenClass: ctx.hiddenClass,
    removedClass: ctx.removedClass,
    badgeClass: ctx.badgeClass,
  })
  const obsoleteCount = globalThis.mortarApplyDimMarks({
    root: ctx.document,
    enabled: ctx.filters.obsolete,
    remove: ctx.removing.obsolete,
    removedClass: ctx.removedClass,
    dimClass: globalThis.mortarDimClasses.obsoleteClass,
    dim: globalThis.mortarTileObsolete,
  })
  const brokenCount = globalThis.mortarApplyDimMarks({
    root: ctx.document,
    enabled: ctx.filters.broken && !cache.nativeFail,
    remove: ctx.removing.broken,
    removedClass: ctx.removedClass,
    dimClass: globalThis.mortarDimClasses.brokenClass,
    dim: (tile) => {
      const link = globalThis.mortarTileTitleLink(tile)
      return Boolean(link) && cache.broken.has(ctx.modID(link.href))
    },
  })
  globalThis.mortarSyncHideInProfileControl(
    globalThis.mortarEnsureHideInProfileControl(ctx.document, ctx.hideControlId, ctx.onHideChange),
    { ...control, status: cache.status },
    removing ? tiles.size : ctx.document.querySelectorAll(`.${ctx.hiddenClass}`).length,
    {
      obsolete: { enabled: ctx.filters.obsolete, count: obsoleteCount },
      broken: {
        enabled: ctx.filters.broken,
        count: brokenCount,
        disabled: cache.nativeFail,
        title: cache.nativeFail ? "Mortar isn't installed" : '',
      },
    },
  )
}

globalThis.mortarCollectInstalledTiles = ({ root, ids, modID, tileFor }) => {
  const tiles = new Map()
  for (const link of root.querySelectorAll(globalThis.mortarTileLinkSelector)) {
    const id = modID(link.href)
    const tile = id !== undefined && ids.has(id) ? tileFor(link) : undefined
    if (tile) {
      tiles.set(tile, id)
    }
  }
  return tiles
}

globalThis.mortarClearUnlistedMarks = ({
  root,
  tiles,
  markerClass,
  hiddenClass,
  removedClass,
  badgeClass,
}) => {
  for (const tile of root.querySelectorAll(`.${markerClass}, .${hiddenClass}, .${removedClass}`)) {
    if (!tiles.has(tile)) {
      tile.classList.remove(markerClass, hiddenClass, removedClass)
      tile.querySelector(`.${badgeClass}`)?.remove()
    }
  }
}
