// Start and tear down Nexus page watchers when the site is enabled or disabled.
globalThis.mortarBindNexusSiteToggle = (ctx) => {
  const ownSelector = `.${ctx.panelClass}, .${ctx.badgeClass}, #mortar-installed-mod-style, #${ctx.hideControlId}`
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
    if (!ctx.siteActive()) {
      return
    }
    let pending
    const started = ctx.siteWatch.watch(
      root,
      (records) => {
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
          ctx.scan(root)
        }, ctx.scanDelayMs)
      },
      {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['href'],
      },
    )
    if (!started) {
      return
    }
    watchShadows(root)
    ctx.scan(root)
  }

  const onVisible = () => {
    if (ctx.siteActive() && document.visibilityState === 'visible') {
      ctx.onVisible()
    }
  }

  const stopSite = () => {
    ctx.setSiteActive(false)
    document.removeEventListener('visibilitychange', onVisible)
    ctx.siteWatch.stop()
    ctx.removePanels()
    ctx.clearFileBadge()
    ctx.resetPanel()
    document.getElementById(ctx.hideControlId)?.remove()
    document.getElementById('mortar-installed-mod-style')?.remove()
    globalThis.mortarClearListingMarks(ctx.listingMarkCtx())
  }

  // Mortar's profile, installed mods and Appearance setting change while the tab is in the background, so coming
  // back re-reads all of it.
  globalThis.mortarWhenSiteEnabled(
    'siteNexus',
    () => {
      ctx.setSiteActive(true)
      document.addEventListener('visibilitychange', onVisible)
      watch(document)
    },
    stopSite,
  )
}
