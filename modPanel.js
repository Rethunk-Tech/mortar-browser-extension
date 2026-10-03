const mortarNexusModPath = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
const mortarNexusNumericMod = /^\d+$/
globalThis.mortarNexusModID = (pathname) => {
  const match = String(pathname || '').match(mortarNexusModPath)
  return match ? Number(match[1]) : undefined
}
globalThis.mortarCollectionURL = (pathname) => {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean)
  const collectionSlugPart = 3
  const collectionPageParts = 4
  const collectionRevisionParts = 5
  if (
    parts[0] !== 'games' ||
    parts[2] !== 'collections' ||
    !parts[1] ||
    !parts[collectionSlugPart]
  ) {
    return
  }
  if (
    parts.length === collectionPageParts ||
    (parts[4] === 'revisions' && parts.length >= collectionRevisionParts)
  ) {
    return `https://www.nexusmods.com/games/${parts[1]}/collections/${parts[collectionSlugPart]}`
  }
}
globalThis.mortarIsNexusModListing = (pathname) => {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean)
  if (parts[0] === 'games' && parts[2] === 'collections' && parts[1]) {
    return true
  }
  if (parts.length < 2 || (parts[1] !== 'mods' && parts[1] !== 'search')) {
    return false
  }
  return !(parts[1] === 'mods' && mortarNexusNumericMod.test(parts[2] || ''))
}

const mortarVersionParts = (value) =>
  String(value || '')
    .match(/\d+/g)
    ?.map(Number) || []
globalThis.mortarNewerVersion = (page, installed) => {
  const a = mortarVersionParts(page)
  const b = mortarVersionParts(installed)
  if (a.length === 0 || b.length === 0) {
    return false
  }
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) {
      return (a[i] || 0) > (b[i] || 0)
    }
  }
  return false
}

const mortarOwnedUpdateCount = (open, others, pageVer, newer) => {
  const owned = []
  if (open.profile && open.version) {
    owned.push(open)
  }
  for (const profile of Array.isArray(others) ? others : []) {
    if (profile?.profile && profile.version) {
      owned.push(profile)
    }
  }
  let updates = 0
  for (const profile of owned) {
    if (profile.updateAvailable || newer(pageVer, profile.version)) {
      updates += 1
    }
  }
  return updates
}

globalThis.mortarModPanelLines = (open, others, pageVer, newer) => {
  const installed = open.version
  const lines = open.profile
    ? [installed ? `In ${open.profile}: version ${installed}` : `Not in ${open.profile}`]
    : []
  if (open.profile && Array.isArray(others) && others.length > 0) {
    lines.push(
      `Also in: ${others
        .map((profile) =>
          profile.version ? `${profile.profile} (version ${profile.version})` : profile.profile,
        )
        .join(', ')}`,
    )
  }
  if (newer(pageVer, installed)) {
    lines.push('Nexus has a newer version')
  }
  const updates = mortarOwnedUpdateCount(open, others, pageVer, newer)
  if (updates > 0) {
    lines.push(`Update available in ${updates} of your profiles`)
  }
  const requiredBy = Array.isArray(open.requiredBy) ? open.requiredBy : []
  const requiredByNames = Array.isArray(open.requiredByNames) ? open.requiredByNames : []
  const requiredByCount = Math.max(requiredBy.length, requiredByNames.length)
  if (open.profile && requiredByCount > 0) {
    const titleLabels =
      requiredByNames.length > 0 ? requiredByNames : requiredBy.map((entry) => String(entry))
    lines.push({
      text: `Required by ${globalThis.mortarPlural(requiredByCount, 'mod', 'mods')} in ${open.profile}`,
      title: titleLabels.join(', '),
    })
  }
  if (open.pinned) {
    lines.push('Pinned in Mortar (this version stays)')
  }
  if (open.skipVersion) {
    lines.push(`Skipped version ${open.skipVersion}`)
  }
  if (Array.isArray(open.skipSources) && open.skipSources.length > 0) {
    for (const source of open.skipSources) {
      lines.push(`Skipped source: ${globalThis.mortarSkipSourceLabel(source)}`)
    }
  }
  return lines
}

globalThis.mortarFillPanelLines = (panel, lines) => {
  panel.replaceChildren()
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) {
      panel.append(document.createTextNode(' · '))
    }
    const line = lines[i]
    if (typeof line === 'string') {
      panel.append(document.createTextNode(line))
    } else {
      const mark = document.createElement('span')
      mark.textContent = line.text
      mark.title = line.title
      panel.append(mark)
    }
  }
  if (lines.length > 0) {
    panel.append(document.createTextNode(' · '))
  }
}

let mortarCollectionPanelURL = ''
globalThis.mortarEnsureInstalledModStyle = (
  doc,
  { markerClass, badgeClass, fileBadgeClass, hiddenClass, panelClass },
) => {
  if (doc.getElementById('mortar-installed-mod-style')) {
    return
  }
  const style = doc.createElement('style')
  style.id = 'mortar-installed-mod-style'
  style.textContent = `
      .${markerClass} { outline: 2px solid #d2a84a !important; outline-offset: -2px; }
      .${markerClass} { position: relative; }
      .${badgeClass} {
        background: #d2a84a;
        border-radius: 3px;
        color: #1d1b16;
        display: inline-block;
        font: 600 11px/1.4 sans-serif;
        margin: 4px;
        padding: 2px 5px;
        position: relative;
        z-index: 1;
      }
      .${fileBadgeClass} .mortar-file-active {
        background: #1d1b16;
        border-radius: 2px;
        color: #f0d78c;
        padding: 0 3px;
      }
      .${hiddenClass} { display: none !important; }
      .${panelClass} {
        background: #242424;
        border-left: 3px solid #d2a84a;
        color: #c7c7c7;
        font: 13px/1.5 sans-serif;
        margin: 8px 0;
        padding: 6px 10px;
      }
      .${panelClass} .mortar-mod-problems { margin-top: 6px; }
      .${panelClass} .mortar-mod-problems ul { margin: 2px 0 0 18px; padding: 0; }
      .${panelClass} button {
        background: none;
        border: none;
        color: #d2a84a;
        cursor: pointer;
        font: inherit;
        padding: 0;
        text-decoration: underline;
      }
      .${panelClass} button:disabled { cursor: default; opacity: 0.6; }
      .${panelClass} .mortar-collection-status { margin-top: 4px; }
    `
  doc.documentElement.append(style)
}
globalThis.mortarSyncCollectionPanel = (
  doc,
  { panelClass, collectionPanelClass, collectionURL, modeOff, sendLink, ensureStyle },
) => {
  const remove = () => {
    for (const el of doc.querySelectorAll(`.${collectionPanelClass}`)) {
      el.remove()
    }
    mortarCollectionPanelURL = ''
  }
  if (modeOff || !collectionURL) {
    remove()
    return
  }
  if (mortarCollectionPanelURL === collectionURL && doc.querySelector(`.${collectionPanelClass}`)) {
    return
  }
  ensureStyle()
  remove()
  const panel = doc.createElement('div')
  panel.className = `${panelClass} ${collectionPanelClass}`
  const btn = doc.createElement('button')
  btn.type = 'button'
  btn.textContent = 'Open in Mortar'
  const status = doc.createElement('div')
  status.className = 'mortar-collection-status'
  btn.addEventListener('click', () => {
    status.textContent = ''
    btn.disabled = true
    try {
      sendLink(collectionURL, (reply, lastError) => {
        btn.disabled = false
        if (lastError) {
          status.textContent = String(lastError)
          return
        }
        if (reply?.ok === false && reply.error) {
          status.textContent = String(reply.error)
          return
        }
        status.textContent = 'Sent to Mortar'
      })
    } catch (error) {
      btn.disabled = false
      status.textContent = error instanceof Error ? error.message : String(error)
    }
  })
  panel.append(btn, status)
  doc.querySelector('h1')?.parentElement?.insertBefore(panel, doc.querySelector('h1')?.nextSibling)
  mortarCollectionPanelURL = collectionURL
}
globalThis.mortarRenderCollectionPanel = async (
  doc,
  pathname,
  { panelClass, collectionPanelClass, currentMode, ensureMarkerStyle },
) => {
  const selectedMode = await currentMode()
  globalThis.mortarSyncCollectionPanel(doc, {
    panelClass,
    collectionPanelClass,
    collectionURL: globalThis.mortarCollectionURL(pathname),
    modeOff: selectedMode === 'off',
    ensureStyle: ensureMarkerStyle,
    sendLink: (link, done) => {
      try {
        chrome.runtime.sendMessage({ link }, (reply) => {
          done(reply, chrome.runtime.lastError?.message)
        })
      } catch (error) {
        done(undefined, error instanceof Error ? error.message : String(error))
      }
    },
  })
}
