// Groups Mortar's native-host `mod` reply into one Files-tab label per Nexus file.
globalThis.mortarFileLabelGroups = (reply) => {
  const items = []
  const take = (profile, active) => {
    if (!profile?.profile) {
      return
    }
    const fileId = Number(profile.fileId) || 0
    const version = typeof profile.version === 'string' ? profile.version : ''
    if (fileId < 1 && version === '') {
      return
    }
    items.push({ name: profile.profile, fileId, version, active: Boolean(active) })
  }
  take(reply?.open, true)
  if (Array.isArray(reply?.others)) {
    for (const profile of reply.others) {
      take(profile, false)
    }
  }
  const groups = []
  const byKey = new Map()
  for (const item of items) {
    const key = item.fileId > 0 ? `id:${item.fileId}` : `v:${item.version}`
    let group = byKey.get(key)
    if (!group) {
      group = { fileId: item.fileId, version: item.version, names: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    if (item.active) {
      group.names.unshift({ name: item.name, active: true })
    } else {
      group.names.push({ name: item.name, active: false })
    }
  }
  return groups
}
