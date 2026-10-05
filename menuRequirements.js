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
        line.href = `https://www.nexusmods.com/${data.game}/mods/${req.modId}`
      }
      missing.push(line)
    } else {
      present += 1
    }
  }
  if (present > 0) {
    missing.push({
      text: `${globalThis.mortarPlural(present, 'requirement', 'requirements')} in this profile`,
    })
  }
  return missing
}
