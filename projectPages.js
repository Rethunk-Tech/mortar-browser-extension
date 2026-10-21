// Paradox Mods and Modrinth: marks mods the open profile already has and offers "Install in Mortar" on a mod page.
// The host's `games` reply names each site's key for the games Mortar manages (sources.paradox, sources.modrinth).
// Both sites draw their pages in the browser, so a mod is told by the address in its links, never by page markup.
const mortarMarketRepaintMs = 300
const mortarMarketParadoxPath = /^\/mods\/(\d+)(?:\/|$)/
const mortarMarketModrinthPath = /^\/mod\/([A-Za-z0-9._-]+)(?:\/|$)/
const mortarMarketProjectPath = /^\/project\/([A-Za-z0-9._-]+)(?:\/|$)/

const mortarMarketPathOf = (href) => {
  try {
    return new URL(href, 'https://example.invalid').pathname
  } catch {
    return ''
  }
}

globalThis.mortarMarketSites = {
  paradox: {
    source: 'paradox',
    siteKey: 'siteParadox',
    host: 'mods.paradoxplaza.com',
    linkSelector: 'a[href*="/mods/"]',
    // A listing card's root holds its link; the site's class names carry a literal [fullhash], not a build hash.
    tileSelector: '[class*="Mods-Card-styles__root"]',
    slugOf: (pathname) => mortarMarketParadoxPath.exec(pathname)?.[1],
    // The id the host's installProject takes and the keys the open profile answers to.
    projectOf: (pathname) => mortarMarketParadoxPath.exec(pathname)?.[1],
  },
  modrinth: {
    source: 'modrinth',
    siteKey: 'siteModrinth',
    host: 'modrinth.com',
    linkSelector: 'a[href^="/mod/"], a[href^="https://modrinth.com/mod/"]',
    // A listing card is a .smart-clickable box whose first child is the link.
    tileSelector: '.smart-clickable',
    slugOf: (pathname) => mortarMarketModrinthPath.exec(pathname)?.[1],
    projectOf: (pathname, canonicalPath = '') =>
      mortarMarketProjectPath.exec(canonicalPath)?.[1] ??
      mortarMarketModrinthPath.exec(pathname)?.[1],
  },
}

// The lowercase key a listing link answers to, or undefined for a link to anything else.
globalThis.mortarMarketLinkKey = (site, href) =>
  site.slugOf(mortarMarketPathOf(href))?.toLowerCase()

// The mod page's keys (as the profile names it) and the project id installProject takes; undefined on any other page.
globalThis.mortarMarketPage = (site, pathname, canonicalHref = '') => {
  const slug = site.slugOf(pathname)
  if (!slug) {
    return
  }
  const project = site.projectOf(pathname, mortarMarketPathOf(canonicalHref))
  return { project, keys: [...new Set([slug.toLowerCase(), project.toLowerCase()])] }
}

// What the page card says: a connection problem, In Mortar profile, or the install button. A game Mortar does not
// manage for the site, like any other page, stays untouched.
globalThis.mortarMarketOverlay = (reply, lastError, { managed, inProfile }) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state !== 'ready') {
    return { text: globalThis.mortarHostResultText(reply, lastError, ''), button: false }
  }
  if (!managed) {
    return
  }
  return inProfile ? { text: 'In Mortar profile', button: false } : { text: 'Mortar', button: true }
}

globalThis.mortarMarketInstallRequest = (site, key, project) => ({
  type: 'installProject',
  source: site.source,
  sourceGameKey: key,
  project,
})

globalThis.mortarMarketResultText = (reply, lastError) =>
  globalThis.mortarHostResultText(reply, lastError, "Mortar couldn't install this mod")

if (
  !globalThis.mortarMarketWatch &&
  typeof chrome !== 'undefined' &&
  typeof document !== 'undefined'
) {
  const site = Object.values(globalThis.mortarMarketSites).find((s) => s.host === location.host)
  globalThis.mortarMarketWatch = Boolean(site)
  if (site) {
    const cardId = 'mortar-market'
    const classes = globalThis.mortarSimpleListingClasses
    const ask = (message) =>
      new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(message, (reply) =>
            resolve({ reply, error: chrome.runtime.lastError }),
          )
        } catch (error) {
          resolve({ error })
        }
      })
    const request = (key) => ({
      type: 'installedProjects',
      source: site.source,
      sourceGameKey: key,
    })
    // The empty key only learns the games; each of the site's games is then asked for its open profile.
    const loadProjects = async () => {
      const probe = await ask(request(''))
      const keys = globalThis.mortarProjectGameKeys(probe.reply, site.source)
      const answers = await Promise.all(keys.map((key) => ask(request(key))))
      const ready = answers.findIndex(
        (a) => globalThis.mortarConnectionState(a.reply, a.error) === 'ready',
      )
      const primary = answers[Math.max(ready, 0)] ?? probe
      return {
        reply: primary.reply,
        error: primary.error,
        managed: keys.length > 0,
        gameKey: ready >= 0 ? keys[ready] : undefined,
        projects: answers.flatMap((a) => a.reply?.projects ?? []),
      }
    }
    let loaded
    let loadedPath = ''
    let siteOn = false
    let shownCard = ''
    const removeCard = () => {
      document.getElementById(cardId)?.remove()
      shownCard = ''
    }
    const clearMarks = () =>
      globalThis.mortarClearUnlistedMarks({ root: document, tiles: new Map(), ...classes })
    const showCard = (overlay, project) => {
      const signature = `${overlay.text}|${overlay.button}`
      if (signature === shownCard && document.getElementById(cardId)) {
        return
      }
      shownCard = signature
      globalThis.mortarCornerCard(document, cardId, 'bottom-right', (card) => {
        const label = document.createElement('span')
        label.className = 'text'
        label.textContent = overlay.text
        card.append(label)
        if (!overlay.button) {
          return
        }
        const button = globalThis.mortarUiButton(document, 'Install in Mortar', true)
        button.addEventListener('click', (event) => {
          globalThis.mortarIfTrusted(event, async () => {
            button.disabled = true
            const { reply, error } = await ask(
              globalThis.mortarMarketInstallRequest(site, loaded.gameKey, project),
            )
            label.textContent = globalThis.mortarMarketResultText(reply, error)
            button.disabled = false
          })
        })
        card.append(button)
      })
    }
    const paint = async () => {
      const settings = await globalThis.mortarReadSettings()
      const { reply, error, managed, projects } = loaded
      globalThis.mortarSetAccent?.(reply?.accent)
      const state = globalThis.mortarConnectionState(reply, error)
      const ready = state === 'ready' && managed
      const mode = globalThis.mortarInstalledMode(settings)
      const wanted = globalThis.mortarProjectKeys(site, projects)
      let count = 0
      if (ready && mode !== 'off') {
        const tiles = globalThis.mortarCollectInstalledTiles({
          root: document,
          ids: wanted,
          modID: (href) => {
            const key = globalThis.mortarMarketLinkKey(site, href)
            return key && wanted.has(key) ? key : undefined
          },
          tileFor: (link) => link.closest(site.tileSelector) || link,
          linkSelector: site.linkSelector,
        })
        globalThis.mortarEnsureSimpleListingStyle(document)
        globalThis.mortarClearUnlistedMarks({ root: document, tiles, ...classes })
        globalThis.mortarApplyListingHideMarks({
          document,
          tiles,
          gray: mode === 'highlight',
          remove: mode === 'hide',
          updates: new Set(),
          showUpdates: false,
          ...classes,
        })
        count = tiles.size
      } else {
        clearMarks()
      }
      globalThis.mortarShowFilterBox(
        document,
        globalThis.mortarFilterBoxRows(settings, [
          {
            row: 'installed',
            label: 'Gray out in profile',
            count,
            disabled: !ready,
            title: ready ? '' : globalThis.mortarStateText(state),
          },
        ]),
      )
      const page = globalThis.mortarMarketPage(
        site,
        location.pathname,
        document.querySelector('link[rel="canonical"]')?.href,
      )
      const overlay =
        page &&
        globalThis.mortarMarketOverlay(reply, error, {
          managed,
          inProfile: ready && page.keys.some((key) => wanted.has(key)),
        })
      if (overlay) {
        showCard(overlay, page.project)
      } else {
        removeCard()
      }
    }
    // The host is asked again only when the address changes; the page's own redraws repaint from the last answer.
    const refresh = async () => {
      if (!siteOn) {
        return
      }
      if (!loaded || loadedPath !== location.pathname) {
        loadedPath = location.pathname
        loaded = await loadProjects()
      }
      await paint()
    }
    const isOwn = (node) =>
      node.id === cardId || node.classList?.contains(classes.badgeClass) === true
    let timer
    const observer = new MutationObserver((records) => {
      const foreign = records.some((r) =>
        [...r.addedNodes, ...r.removedNodes].some((node) => !isOwn(node)),
      )
      if (siteOn && foreign) {
        clearTimeout(timer)
        timer = setTimeout(() => refresh().catch(() => false), mortarMarketRepaintMs)
      }
    })
    try {
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === 'sync' && siteOn && loaded) {
          paint().catch(() => false)
        }
      })
    } catch {
      // A page without chrome.storage still gets the first paint.
    }
    globalThis.mortarWhenSiteEnabled(
      site.siteKey,
      () => {
        siteOn = true
        observer.observe(document.body, { childList: true, subtree: true })
        refresh().catch(() => false)
      },
      () => {
        siteOn = false
        observer.disconnect()
        removeCard()
        globalThis.mortarRemoveFilterBox(document)
        clearMarks()
      },
    )
  }
}
