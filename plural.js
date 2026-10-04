globalThis.mortarPlural = (n, singular, plural) => (n === 1 ? `1 ${singular}` : `${n} ${plural}`)

globalThis.mortarSkipSourceLabel = (source) => {
  const key = String(source || '').toLowerCase()
  if (key === 'github') {
    return 'GitHub'
  }
  if (key === 'nexus') {
    return 'Nexus Mods'
  }
  return String(source || '')
}

// How far the extension is from Mortar's data: 'missing' (no native host), then the host's own state ('off',
// 'notRunning', 'noProfile', 'ready'). A reply without a state counts as ready only when it says connected.
globalThis.mortarConnectionState = (reply, lastError) => {
  if (lastError || !reply || reply.nativeMessagingError === true) {
    return 'missing'
  }
  if (['off', 'notRunning', 'noProfile', 'ready'].includes(reply.state)) {
    return reply.state
  }
  return reply.connected === true ? 'ready' : 'noProfile'
}

// The Nexus domains Mortar manages, as the native host reports them; Stardew Valley until a reply says more.
globalThis.mortarSupportedGames = (reply) =>
  Array.isArray(reply?.games) && reply.games.length > 0 ? reply.games : ['stardewvalley']

globalThis.mortarInstallHint =
  "Mortar isn't installed. Install Mortar and open it once to connect this browser."

const mortarStateCopy = {
  missing: "Mortar isn't installed",
  off: 'Browser extension connection is off in Mortar',
  notRunning: "Mortar isn't running",
  noProfile: 'Open a profile in Mortar',
}

globalThis.mortarInstalledReplyStatus = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state !== 'ready') {
    return mortarStateCopy[state]
  }
  return Array.isArray(reply?.modIds) ? '' : 'Mortar could not read this profile'
}

// What the collection panel says after handing the collection link to Mortar.
globalThis.mortarLinkResultText = (reply, lastError) => {
  if (lastError || !reply || reply.nativeMessagingError === true) {
    return globalThis.mortarInstallHint
  }
  return reply.ok === true ? 'Sent to Mortar' : "Mortar couldn't open this collection"
}
