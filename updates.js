const mortarAccentHex = /^#[0-9a-f]{6}$/i

const mortarUpdateRowText = ({ name, installed, latest }) => {
  if (installed && latest) {
    return `${name} ${installed} → ${latest}`
  }
  return latest ? `${name} → ${latest}` : `${name} (newer file)`
}

// Protocol 4 rows name the mod's page; a protocol 3 Mortar sends Nexus rows only, linked to the mod's files tab.
const mortarUpdateRowHref = (u) => {
  if (typeof u.url === 'string' && u.url.startsWith('https://')) {
    return u.url
  }
  return `https://www.nexusmods.com/${encodeURIComponent(String(u.game ?? ''))}/mods/${encodeURIComponent(String(u.modId ?? ''))}?tab=files`
}

globalThis.mortarUpdatesBadge = (reply, error) => {
  if (error || !Array.isArray(reply?.updates) || globalThis.mortarProtocolMismatch(reply) !== '') {
    return {
      text: '',
      background: '#D6B17A',
      color: '#1b1a17',
      rows: [],
      profile: '',
      state: globalThis.mortarConnectionState(reply, error),
    }
  }
  const { accent, updates, profile } = reply
  const background = typeof accent === 'string' && mortarAccentHex.test(accent) ? accent : '#D6B17A'
  const rows = updates.map((u) => {
    const row = {
      modId: u.modId,
      name: u.name,
      installed: u.installed,
      latest: u.latest ?? '',
      source: u.source,
      id: u.id,
    }
    return { ...row, text: mortarUpdateRowText(row), href: mortarUpdateRowHref(u) }
  })
  return {
    text: updates.length === 0 ? '' : String(updates.length),
    background,
    color: '#1b1a17',
    rows,
    profile: typeof profile === 'string' ? profile : '',
    state: globalThis.mortarConnectionState(reply, error),
  }
}
