const status = document.querySelector('#status')

const paintStatus = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  const problem = globalThis.mortarInstalledReplyStatus(reply, lastError)
  const open = document.querySelector('#mortar-open-app')
  open.hidden = state === 'missing'
  open.classList.toggle('primary', state === 'notRunning')
  if (problem) {
    status.textContent = state === 'missing' ? globalThis.mortarInstallHint : problem
    return
  }
  status.textContent = globalThis.mortarPopupReadyStatus(reply)
}

const refreshStatus = () => {
  let lastError
  const ask = (game) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage(globalThis.mortarGameRequest('installed', game), (reply) => {
        lastError ??= chrome.runtime.lastError
        resolve(reply)
      })
    })
  const askPackages = (key) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'installedPackages', source: 'thunderstore', sourceGameKey: key },
        (reply) => {
          lastError ??= chrome.runtime.lastError
          resolve(reply)
        },
      )
    })
  globalThis.mortarAskEachGame(ask).then(async ({ replies, primary }) => {
    const { reply, lastError: paintError } = globalThis.mortarPopupStatusInput(
      replies,
      primary,
      lastError,
    )
    const keys = globalThis.mortarThunderstoreCommunities(reply)
    const packageReplies = await Promise.all(keys.map(askPackages))
    const packages = packageReplies.flatMap((r) => (Array.isArray(r?.packages) ? r.packages : []))
    paintStatus({ ...reply, packages }, paintError)
  })
}
globalThis.mortarRefreshPopupStatus = refreshStatus

refreshStatus()

const updatesList = document.querySelector('#updates')
const updatesEmpty = document.querySelector('#updates-empty')
const updatesHeading = document.querySelector('#updates-heading')

const paintPopupUpdates = (stored) => {
  const view = globalThis.mortarUpdatesBadge(stored?.updatesReply, stored?.updatesError)
  document.documentElement.style.setProperty('--accent', view.background)
  updatesList.replaceChildren()
  // The status line above already says why there is nothing to list when Mortar is not connected.
  const ready = view.state === 'ready'
  updatesHeading.hidden = !ready
  updatesHeading.textContent = view.profile ? `Updates in ${view.profile}` : 'Updates'
  updatesEmpty.textContent = ready && view.rows.length === 0 ? 'No updates' : ''
  for (const row of view.rows) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.href = row.href
    link.target = '_blank'
    link.textContent = row.text
    if (row.source) {
      const site = document.createElement('span')
      site.className = 'source'
      site.textContent = globalThis.mortarSkipSourceLabel(row.source)
      link.append(site)
    }
    item.append(link)
    updatesList.append(item)
  }
}
globalThis.mortarPaintPopupUpdates = paintPopupUpdates

chrome.storage.session.get(['updatesReply', 'updatesError'], paintPopupUpdates)
