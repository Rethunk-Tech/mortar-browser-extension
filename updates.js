globalThis.mortarUpdatesBadge = (reply, error) => {
  if (error || !reply || !Array.isArray(reply.updates)) {
    return {
      text: '',
      background: '#D6B17A',
      color: '#1b1a17',
      rows: [],
      profile: '',
      status: 'unreachable',
    }
  }
  const { accent, updates, profile } = reply
  const background = typeof accent === 'string' && accent ? accent : '#D6B17A'
  const rows = updates.map((u) => ({
    modId: u.modId,
    name: u.name,
    installed: u.installed,
    latest: u.latest ?? '',
    href: `https://www.nexusmods.com/stardewvalley/mods/${u.modId}?tab=files`,
  }))
  return {
    text: updates.length === 0 ? '' : String(updates.length),
    background,
    color: '#1b1a17',
    rows,
    profile: typeof profile === 'string' ? profile : '',
    status: 'ok',
  }
}
