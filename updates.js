const mortarUpdateRowText = ({ name, installed, latest }) => {
  if (installed && latest) {
    return `${name} ${installed} → ${latest}`
  }
  return latest ? `${name} → ${latest}` : `${name} (newer file)`
}

globalThis.mortarUpdatesBadge = (reply, error) => {
  if (error || !Array.isArray(reply?.updates) || globalThis.mortarProtocolMismatch(reply) !== '') {
    return {
      text: '',
      background: '#D6B17A',
      color: '#1b1a17',
      rows: [],
      profile: '',
      status: 'unreachable',
      state: globalThis.mortarConnectionState(reply, error),
    }
  }
  const { accent, updates, profile } = reply
  const background = typeof accent === 'string' && accent ? accent : '#D6B17A'
  const rows = updates.map((u) => {
    const row = { modId: u.modId, name: u.name, installed: u.installed, latest: u.latest ?? '' }
    return {
      ...row,
      text: mortarUpdateRowText(row),
      href: `https://www.nexusmods.com/stardewvalley/mods/${u.modId}?tab=files`,
    }
  })
  return {
    text: updates.length === 0 ? '' : String(updates.length),
    background,
    color: '#1b1a17',
    rows,
    profile: typeof profile === 'string' ? profile : '',
    status: 'ok',
    state: globalThis.mortarConnectionState(reply, error),
  }
}
