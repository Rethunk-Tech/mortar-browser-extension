const modeKey = 'mode'
const mode = document.querySelector('#mode')

const normalized = (value) => (value === 'off' || value === 'hide' ? value : 'highlight')

chrome.storage.local.get({ [modeKey]: 'highlight' }, (result) => {
  if (!chrome.runtime.lastError) {
    mode.value = normalized(result?.[modeKey])
  }
})

mode.addEventListener('change', () => {
  chrome.storage.local.set({ [modeKey]: normalized(mode.value) })
})
