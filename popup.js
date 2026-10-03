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
