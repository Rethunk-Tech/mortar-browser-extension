globalThis.mortarModPanelLines = (open, others, pageVer, newer) => {
  const installed = open.version
  const lines = open.profile
    ? [installed ? `In ${open.profile}: version ${installed}` : `Not in ${open.profile}`]
    : []
  if (open.profile && Array.isArray(others) && others.length > 0) {
    lines.push(`Also in: ${others.map((profile) => profile.profile).join(', ')}`)
  }
  if (newer(pageVer, installed)) {
    lines.push('Nexus has a newer version')
  }
  const requiredBy = Array.isArray(open.requiredBy) ? open.requiredBy : []
  if (open.profile && requiredBy.length > 0) {
    lines.push({
      text: `Required by ${globalThis.mortarPlural(requiredBy.length, 'mod', 'mods')} in ${open.profile}`,
      title: requiredBy.join(', '),
    })
  }
  if (open.pinned) {
    lines.push('Pinned')
  }
  if (open.skipVersion) {
    lines.push(`Skipped version ${open.skipVersion}`)
  }
  if (Array.isArray(open.skipSources) && open.skipSources.length > 0) {
    lines.push(`Skipped source: ${open.skipSources.join(', ')}`)
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
