const modeKey = 'mode'
const mode = document.querySelector('#mode')
const status = document.querySelector('#status')

const normalized = (value) => (value === 'off' || value === 'hide' ? value : 'highlight')

const refreshStatus = () => {
  chrome.runtime.sendMessage({ type: 'installed', game: 'stardewvalley' }, (reply) => {
    if (chrome.runtime.lastError || reply?.nativeMessagingError === true) {
      status.textContent = "Mortar's browser helper is not installed"
      return
    }
    const modIds = Array.isArray(reply?.modIds) ? reply.modIds : []
    if (modIds.length === 0) {
      status.textContent = 'Mortar is not running or no profile is open'
      return
    }
    status.textContent = `Connected to Mortar · ${modIds.length} mods in the open profile`
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
