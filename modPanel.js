const mortarNexusModPath = /^\/[^/]+\/mods\/(\d+)(?:\/|$)/
const mortarNexusNumericMod = /^\d+$/
globalThis.mortarNexusModID = (pathname) => {
  const match = String(pathname || '').match(mortarNexusModPath)
  return match ? Number(match[1]) : undefined
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
