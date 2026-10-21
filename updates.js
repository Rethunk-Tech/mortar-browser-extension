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

// The updates replies of every game the host manages, each with its rows tagged by game. A protocol 4 Mortar answers
// for any source a game lists (the Nexus key first), so a game with no Nexus page still gets rows; a protocol 3
// Mortar is asked for Nexus games only.
const mortarAllSourcesProtocol = 4

globalThis.mortarAskUpdates = async (send) => {
  const probe = await send(globalThis.mortarGameRequest('updates', ''))
  let asks
  if ((probe?.protocol ?? 0) >= mortarAllSourcesProtocol) {
    asks = (Array.isArray(probe.games) ? probe.games : [])
      .map((g) => {
        const listed = Object.entries(g?.sources ?? {})
        const [source, key] = listed.find(([id]) => id === 'nexus') ?? listed[0] ?? ['', '']
        return {
          game: g?.sources?.nexus ?? '',
          request: { type: 'updates', source, sourceGameKey: key },
        }
      })
      .filter((a) => a.request.source !== '')
  } else {
    asks = globalThis.mortarSupportedGames(probe).map((game) => ({
      game,
      request: globalThis.mortarGameRequest('updates', game),
    }))
  }
  const replies = await Promise.all(asks.map((a) => send(a.request)))
  const primary =
    replies.find((r) => globalThis.mortarConnectionState(r) === 'ready') ?? replies[0] ?? probe
  return {
    ...primary,
    updates: replies.flatMap((r, i) =>
      (Array.isArray(r?.updates) ? r.updates : []).map((u) => ({ ...u, game: asks[i].game })),
    ),
  }
}
