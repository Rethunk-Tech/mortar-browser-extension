const modeKey = 'mode'
const mode = document.querySelector('#mode')
const status = document.querySelector('#status')

const normalized = (value) => (value === 'off' || value === 'hide' ? value : 'highlight')

const refreshStatus = () => {
  chrome.runtime.sendMessage({ type: 'installed', game: 'stardewvalley' }, (reply) => {
    const problem = globalThis.mortarInstalledReplyStatus(reply, chrome.runtime.lastError)
    if (problem) {
      status.textContent = problem
      return
    }
    const { modIds } = reply
    if (modIds.length === 0) {
      status.textContent = 'Mortar is running; this profile has no Nexus mods'
      return
    }
    const modCount = globalThis.mortarPlural(modIds.length, 'mod', 'mods')
    status.textContent = `Connected to Mortar · ${modCount} in the open profile`
  })
}

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

chrome.storage.session.get(['updatesReply', 'updatesError'], (stored) => {
  const view = globalThis.mortarUpdatesBadge(stored?.updatesReply, stored?.updatesError)
  document.documentElement.style.setProperty('--accent', view.background)
  updatesHeading.textContent = view.profile ? `Updates in ${view.profile}` : 'Updates'
  updatesList.replaceChildren()
  if (view.status === 'unreachable') {
    updatesEmpty.textContent = 'Mortar is not running'
    return
  }
  if (view.rows.length === 0) {
    updatesEmpty.textContent = 'No updates'
    return
  }
  updatesEmpty.textContent = ''
  for (const row of view.rows) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    const { href, name, installed, latest } = row
    link.href = href
    link.target = '_blank'
    link.textContent = `${name} ${installed} → ${latest}`
    item.append(link)
    updatesList.append(item)
  }
})
