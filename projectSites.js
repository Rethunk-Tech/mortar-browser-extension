// CurseForge and the Vintage Story Mod DB: marks mods the open profile already has, offers the same filter box as the
// other sites, and hands the Install button's link (curseforge://install, vintagestorymodinstall://) to Mortar.
// A profile entry is told from a page by project id (CurseForge page), asset id (Mod DB) or, on CurseForge listings,
// the mod's name, since CurseForge tiles carry no id.
const mortarProjectName = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
const mortarCurseForgeModPath = /^\/[^/]+\/[^/]+\/([^/]+)\/?$/
const mortarVsModPath = /^\/show\/mod\/(\d+)/
const mortarVsAliasPath = /^\/([A-Za-z0-9_-]+)\/?$/
const mortarCurseForgeInstallPath = /\/install\/\d+/
const mortarCurseForgeInstallLink = /curseforge:\/\/install\?[^"'<>\s]+/

const mortarPathOf = (href) => {
  try {
    return new URL(href).pathname
  } catch {
    return ''
  }
}

globalThis.mortarProjectSites = {
  curseforge: {
    source: 'curseforge',
    siteKey: 'siteCurseForge',
    host: 'www.curseforge.com',
    tileSelector: '.project-card',
    // A tile's keys: the slug in its link, then the mod's name when the link has words (the profile may not know the
    // slug yet).
    listingKeys: (link) =>
      [
        mortarCurseForgeModPath.exec(mortarPathOf(link.href))?.[1]?.toLowerCase(),
        mortarCurseForgeModPath.test(mortarPathOf(link.href))
          ? mortarProjectName(link.textContent)
          : '',
      ].filter(Boolean),
    pageKeys: (doc, pathname) => {
      const slug = mortarCurseForgeModPath.exec(pathname)?.[1]
      if (!slug) {
        return []
      }
      const label = [...doc.querySelectorAll('dt')].find(
        (el) => el.textContent.trim() === 'Project ID',
      )
      return [
        label?.nextElementSibling?.textContent.trim(),
        slug.toLowerCase(),
        mortarProjectName(doc.querySelector('h1')?.textContent),
      ].filter(Boolean)
    },
    // The Install buttons are https links to a page that holds the real curseforge:// link.
    installAnchor: (href, origin) => {
      try {
        const url = new URL(href)
        return url.origin === origin && mortarCurseForgeInstallPath.test(url.pathname)
          ? href
          : undefined
      } catch {
        return
      }
    },
    resolveLink: async (href, fetchText) =>
      mortarCurseForgeInstallLink.exec(await fetchText(href))?.[0].replaceAll('&amp;', '&'),
  },
  vsmoddb: {
    source: 'vsmoddb',
    siteKey: 'siteVsModDb',
    host: 'mods.vintagestory.at',
    tileSelector: 'div.mod',
    // Only some tiles link by asset id; the rest link by the mod's alias.
    listingKeys: (link) => {
      const path = mortarPathOf(link.href)
      const key = mortarVsModPath.exec(path)?.[1] ?? mortarVsAliasPath.exec(path)?.[1]
      return key ? [key.toLowerCase()] : []
    },
    pageKeys: (doc, pathname) => {
      const keys = (path) => {
        const key = mortarVsModPath.exec(path)?.[1] ?? mortarVsAliasPath.exec(path)?.[1]
        return key ? [key.toLowerCase()] : []
      }
      const canonical = doc.querySelector('link[rel="canonical"]')?.href
      return [...keys(pathname), ...(canonical ? keys(mortarPathOf(canonical)) : [])]
    },
    installAnchor: (href) =>
      href.toLowerCase().startsWith('vintagestorymodinstall://') ? href : undefined,
    resolveLink: (href) => Promise.resolve(href),
  },
}

// The keys a profile's projects answer to: ids, slugs or aliases, and on CurseForge names too.
globalThis.mortarProjectKeys = (site, projects) =>
  new Set(
    (Array.isArray(projects) ? projects : [])
      .flatMap((p) => [
        String(p?.id).toLowerCase(),
        String(p?.slug || '').toLowerCase(),
        ...(site.source === 'curseforge' ? [mortarProjectName(p?.name)] : []),
      ])
      .filter(Boolean),
  )

// The Mortar game keys a host reply names for the source.
globalThis.mortarProjectGameKeys = (reply, source) =>
  (Array.isArray(reply?.games) ? reply.games : [])
    .map((g) => g?.sources?.[source])
    .filter((key) => typeof key === 'string' && key !== '')

// The Install anchor under a click, when it is the site's own Install button.
globalThis.mortarProjectInstallAnchor = (site, target, origin) => {
  const href = target?.closest?.('a[href]')?.href
  return typeof href === 'string' ? site.installAnchor(href, origin) : undefined
}

// What the page overlay says: a connection problem, or In Mortar profile; nothing when the page is not in the profile
// or the host manages no game of the source.
globalThis.mortarProjectOverlay = (reply, lastError, inProfile) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state !== 'ready') {
    return globalThis.mortarHostResultText(reply, lastError, '')
  }
  return inProfile ? 'In Mortar profile' : undefined
}

if (
  !globalThis.mortarProjectWatch &&
  typeof chrome !== 'undefined' &&
  typeof document !== 'undefined'
) {
  const site = Object.values(globalThis.mortarProjectSites).find((s) => s.host === location.host)
  globalThis.mortarProjectWatch = Boolean(site)
  if (site) {
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
    // The empty key only learns the games; each of the source's games is then asked for its open profile.
    const profileProjects = async () => {
      const probe = await ask(request(''))
      const keys = globalThis.mortarProjectGameKeys(probe.reply, site.source)
      const answers = await Promise.all(keys.map((key) => ask(request(key))))
      const primary =
        answers.find((a) => globalThis.mortarConnectionState(a.reply, a.error) === 'ready') ??
        answers[0] ??
        probe
      return {
        reply: primary.reply,
        error: primary.error,
        managed: keys.length > 0,
        projects: answers.flatMap((a) => a.reply?.projects ?? []),
      }
    }
    const clearMarks = () =>
      globalThis.mortarClearUnlistedMarks({
        root: document,
        tiles: new Map(),
        ...globalThis.mortarSimpleListingClasses,
      })
    const tileFor = (link) => link.closest(site.tileSelector)
    const paint = async () => {
      const settings = await globalThis.mortarReadSettings()
      const { reply, error, managed, projects } = await profileProjects()
      globalThis.mortarSetAccent?.(reply?.accent)
      const state = globalThis.mortarConnectionState(reply, error)
      const ready = state === 'ready' && managed
      const mode = globalThis.mortarInstalledMode(settings)
      const classes = globalThis.mortarSimpleListingClasses
      const wanted = globalThis.mortarProjectKeys(site, projects)
      let count = 0
      if (ready && mode !== 'off') {
        const tiles = globalThis.mortarCollectInstalledTiles({
          root: document,
          ids: wanted,
          modID: (_href, link) => site.listingKeys(link).find((key) => wanted.has(key)),
          tileFor,
          linkSelector: 'a[href]',
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
      const keys = site.pageKeys(document, location.pathname)
      const text =
        keys.length > 0 &&
        globalThis.mortarProjectOverlay(reply, error, ready && keys.some((key) => wanted.has(key)))
      showOverlay(text || '')
    }
    const showOverlay = (text) => {
      document.getElementById('mortar-project')?.remove()
      if (!text) {
        return
      }
      const host = document.createElement('div')
      host.id = 'mortar-project'
      const box = document.createElement('div')
      box.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:8px 12px;border-radius:8px;background:#1b1a17;color:#f2efe8;font:14px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4)'
      box.textContent = text
      host.attachShadow({ mode: 'closed' }).append(box)
      document.body.append(host)
    }
    // A real click on the site's Install button goes to Mortar; when the link cannot be found or Mortar does not take
    // it, the button's own navigation runs as it would without the extension.
    let siteOn = false
    const fetchText = async (href) => {
      const response = await fetch(href, { credentials: 'same-origin' })
      return response.ok ? response.text() : ''
    }
    const onClick = (event) => {
      const anchor =
        siteOn && globalThis.mortarProjectInstallAnchor(site, event.target, location.origin)
      if (!(anchor && event.isTrusted)) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      site
        .resolveLink(anchor, fetchText)
        .then((link) => (link ? ask({ link }) : { error: true }))
        .then(({ reply, error }) => {
          if (error || reply?.ok !== true) {
            location.assign(anchor)
          }
        })
        .catch(() => location.assign(anchor))
    }
    document.addEventListener('click', onClick, true)
    try {
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === 'sync' && siteOn) {
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
        paint().catch(() => false)
      },
      () => {
        siteOn = false
        showOverlay('')
        globalThis.mortarRemoveFilterBox(document)
        clearMarks()
      },
    )
  }
}
