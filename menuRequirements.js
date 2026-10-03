globalThis.mortarRequirementLines = (data) => {
  const reqs = Array.isArray(data?.requirements) ? data.requirements : []
  if (reqs.length === 0) {
    return []
  }
  const missing = []
  let present = 0
  for (const req of reqs) {
    if (req.external || !req.present) {
      const line = { text: `Needs ${req.name}`, problem: true }
      if (!req.external && req.modId > 0) {
        line.href = `https://www.nexusmods.com/stardewvalley/mods/${req.modId}`
      }
      missing.push(line)
    } else {
      present += 1
    }
  }
  if (present > 0) {
    missing.push({ text: `${present} requirements in this profile` })
  }
  return missing
}

globalThis.mortarFetchRequirements = (game, modId) =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'requirements', game, modId }, (response) => {
        globalThis.mortarSetAccent?.(response?.accent)
        resolve(Array.isArray(response?.requirements) ? response.requirements : [])
      })
    } catch {
      resolve([])
    }
  })
