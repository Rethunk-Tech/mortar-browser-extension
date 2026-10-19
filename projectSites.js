// CurseForge and the Vintage Story Mod DB: marks mods the open profile already has, offers the same filter box as the
// other sites, and hands the Install button's link (curseforge://install, vintagestorymodinstall://) to Mortar.
// A profile entry is told from a page by project id (CurseForge page), asset id (Mod DB) or, on CurseForge listings,
// the mod's name, since CurseForge tiles carry no id.
const mortarProjectName = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
const mortarCurseForgeModPath = /^\/[^/]+\/[^/]+\/[^/]+\/?$/
const mortarVsModPath = /^\/show\/mod\/(\d+)/

globalThis.mortarProjectSites = {
  curseforge: {
    source: 'curseforge',
    siteKey: 'siteCurseForge',
    scheme: 'curseforge:',
    host: 'www.curseforge.com',
    // A tile is keyed by its title link's text, so only a link to a mod page with words in it counts.
    listingKey: (link) =>
      mortarCurseForgeModPath.test(new URL(link.href).pathname)
        ? mortarProjectName(link.textContent) || undefined
        : undefined,
    pageKeys: (doc, pathname) => {
      if (!mortarCurseForgeModPath.test(pathname)) {
        return []
      }
      const label = [...doc.querySelectorAll('li, div, dt, span')].find(
        (el) => el.children.length === 0 && el.textContent.trim() === 'Project ID',
      )
      return [
        label?.nextElementSibling?.textContent.trim(),
        mortarProjectName(doc.querySelector('h1')?.textContent),
      ].filter(Boolean)
    },
  },
  vsmoddb: {
    source: 'vsmoddb',
    siteKey: 'siteVsModDb',
    scheme: 'vintagestorymodinstall:',
    host: 'mods.vintagestory.at',
    listingKey: (link) => mortarVsModPath.exec(new URL(link.href).pathname)?.[1],
    pageKeys: (doc, pathname) => {
      const here = mortarVsModPath.exec(pathname)?.[1]
      const canonical = doc.querySelector('link[rel="canonical"]')?.href
      return [here ?? (canonical && mortarVsModPath.exec(new URL(canonical).pathname)?.[1])].filter(
        Boolean,
      )
    },
  },
}

// The keys a profile's projects answer to: ids, and on CurseForge names too.
globalThis.mortarProjectKeys = (site, projects) =>
  new Set(
    (Array.isArray(projects) ? projects : []).flatMap((p) => [
      String(p?.id),
      ...(site.source === 'curseforge' ? [mortarProjectName(p?.name)] : []),
    ]),
  )

// The Mortar game keys a host reply names for the source.
globalThis.mortarProjectGameKeys = (reply, source) =>
  (Array.isArray(reply?.games) ? reply.games : [])
    .map((g) => g?.sources?.[source])
    .filter((key) => typeof key === 'string' && key !== '')

// The install link under a click, when the site's own Install button wrote it.
globalThis.mortarProjectInstallLink = (site, target) => {
  const href = target?.closest?.('a[href]')?.href
  if (typeof href !== 'string') {
    return
  }
  try {
    return new URL(href).protocol === site.scheme ? href : undefined
  } catch {
    return
  }
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
    const tileFor = (link) => link.closest('article, li, tr') || link
    const paint = async () => {
      const settings = await globalThis.mortarReadSettings()
      const { reply, error, managed, projects } = await profileProjects()
      globalThis.mortarSetAccent?.(reply?.accent)
      const state = globalThis.mortarConnectionState(reply, error)
      const ready = state === 'ready' && managed
      const mode = globalThis.mortarInstalledMode(settings)
      const classes = globalThis.mortarSimpleListingClasses
      let count = 0
      if (ready && mode !== 'off') {
        const tiles = globalThis.mortarCollectInstalledTiles({
          root: document,
          ids: globalThis.mortarProjectKeys(site, projects),
          modID: (_href, link) => site.listingKey(link),
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
      const wanted = globalThis.mortarProjectKeys(site, projects)
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
    // A real click on the site's Install button goes to Mortar; if Mortar does not take it the site's own handler runs
    // as it would without the extension.
    let siteOn = false
    const onClick = (event) => {
      const link = siteOn && globalThis.mortarProjectInstallLink(site, event.target)
      if (!(link && event.isTrusted)) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      ask({ link })
        .then(({ reply, error }) => {
          if (error || reply?.ok !== true) {
            location.assign(link)
          }
        })
        .catch(() => false)
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
