const modeKey = 'mode'
const mode = document.querySelector('#mode')
const status = document.querySelector('#status')

const normalized = (value) => (value === 'off' || value === 'hide' ? value : 'highlight')

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
  const { modIds, profile } = reply
  if (modIds.length === 0) {
    status.textContent = `Connected to Mortar · ${profile || 'the open profile'} has no Nexus mods`
    return
  }
  const modCount = globalThis.mortarPlural(modIds.length, 'Nexus mod', 'Nexus mods')
  status.textContent = `Connected to Mortar · ${modCount} in ${profile || 'the open profile'}`
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
  globalThis.mortarAskEachGame(ask).then(({ replies, primary }) => {
    const modIds = replies.flatMap((r) => (Array.isArray(r?.modIds) ? r.modIds : []))
    paintStatus(Array.isArray(primary?.modIds) ? { ...primary, modIds } : primary, lastError)
  })
}
globalThis.mortarRefreshPopupStatus = refreshStatus

chrome.storage.local.get({ [modeKey]: 'highlight' }, (result) => {
  if (!chrome.runtime.lastError) {
    mode.value = normalized(result?.[modeKey])
  }
})

mode.addEventListener('change', () => {
  chrome.storage.local.set({ [modeKey]: normalized(mode.value) })
})

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
    item.append(link)
    updatesList.append(item)
  }
}
globalThis.mortarPaintPopupUpdates = paintPopupUpdates

chrome.storage.session.get(['updatesReply', 'updatesError'], paintPopupUpdates)
