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

// The native-messaging protocol this extension speaks, sent with every message, and the range of Mortar protocols
// it understands. A reply that names none counts as protocol 0.
globalThis.mortarProtocol = 2
const mortarProtocolMin = 2
const mortarProtocolMax = 2

// 'mortarOld' or 'extensionOld' when the two sides do not speak a common protocol, else ''. Mortar's own verdict on
// this extension's protocol wins; otherwise Mortar's protocol is checked against this extension's range.
globalThis.mortarProtocolMismatch = (reply) => {
  if (reply?.protocolError === 'extensionTooOld') {
    return 'extensionOld'
  }
  if (reply?.protocolError === 'extensionTooNew') {
    return 'mortarOld'
  }
  const protocol = reply?.protocol ?? 0
  if (protocol < mortarProtocolMin) {
    return 'mortarOld'
  }
  return protocol > mortarProtocolMax ? 'extensionOld' : ''
}

// How far the extension is from Mortar's data: 'missing' (no native host), a protocol mismatch ('mortarOld',
// 'extensionOld'), then the host's own state ('off', 'notRunning', 'noProfile', 'ready'). A reply without a state
// counts as ready only when it says connected.
globalThis.mortarConnectionState = (reply, lastError) => {
  if (lastError || !reply || reply.nativeMessagingError === true) {
    return 'missing'
  }
  const mismatch = globalThis.mortarProtocolMismatch(reply)
  if (mismatch !== '') {
    return mismatch
  }
  if (['off', 'notRunning', 'noProfile', 'ready'].includes(reply.state)) {
    return reply.state
  }
  return reply.connected === true ? 'ready' : 'noProfile'
}

// The host's games, [{id, name, sources: {nexus: domain}}]; none until a reply says so.
const hostGames = (reply) => (Array.isArray(reply?.games) ? reply.games : [])

// The Nexus domains of the games Mortar manages.
globalThis.mortarSupportedGames = (reply) =>
  hostGames(reply)
    .map((g) => g?.sources?.nexus)
    .filter((domain) => typeof domain === 'string' && domain !== '')

// The Mortar game id of a Nexus domain, from the host's list; undefined when Mortar does not manage it.
globalThis.mortarGameID = (reply, domain) =>
  hostGames(reply).find((g) => g?.sources?.nexus === domain)?.id

// A data request for the page's Nexus game.
globalThis.mortarGameRequest = (type, domain, extra) => ({
  type,
  source: 'nexus',
  sourceGameKey: domain,
  ...extra,
})

// Every host reply lists the managed games, so a request with no game learns them; then each game is asked in turn.
// The primary reply carries the shared fields (state, accent, profile): the first game that is ready, else the first.
globalThis.mortarAskEachGame = async (ask) => {
  const probe = await ask('')
  const games = globalThis.mortarSupportedGames(probe)
  const replies = await Promise.all(games.map(ask))
  const primary =
    replies.find((r) => globalThis.mortarConnectionState(r) === 'ready') ?? replies[0] ?? probe
  return { games, replies, primary }
}

globalThis.mortarInstallHint =
  "Mortar isn't installed. Install Mortar and open it once to connect this browser."

const mortarStateCopy = {
  missing: "Mortar isn't installed",
  off: 'Browser extension connection is off in Mortar',
  notRunning: "Mortar isn't running",
  noProfile: 'Open a profile in Mortar',
  mortarOld: 'Update Mortar: it is too old for this browser extension',
  extensionOld: 'Update the browser extension: it is too old for this Mortar',
}

globalThis.mortarStateText = (state) => mortarStateCopy[state] ?? ''

globalThis.mortarInstalledReplyStatus = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state !== 'ready') {
    return globalThis.mortarStateText(state)
  }
  return Array.isArray(reply?.modIds) ? '' : 'Mortar could not read this profile'
}

// What the collection panel says after handing the collection link to Mortar.
globalThis.mortarLinkResultText = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  if (state === 'missing') {
    return globalThis.mortarInstallHint
  }
  if (state === 'mortarOld' || state === 'extensionOld') {
    return globalThis.mortarStateText(state)
  }
  return reply.ok === true ? 'Sent to Mortar' : "Mortar couldn't open this collection"
}
