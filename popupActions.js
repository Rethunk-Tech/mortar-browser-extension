document.getElementById('mortar-open-app')?.addEventListener('click', (event) => {
  event.preventDefault()
  const link = document.createElement('a')
  link.href = 'mortar://'
  link.click()
})

const mortarCheckNow = document.getElementById('mortar-check-now')
mortarCheckNow?.addEventListener('click', (event) => {
  event.preventDefault()
  mortarCheckNow.disabled = true
  mortarCheckNow.textContent = 'Checking…'
  chrome.runtime.sendMessage({ type: 'checkNow' }, (stored) => {
    mortarCheckNow.disabled = false
    mortarCheckNow.textContent = 'Check now'
    globalThis.mortarPaintPopupUpdates?.(chrome.runtime.lastError ? undefined : stored)
    globalThis.mortarRefreshPopupStatus?.()
  })
})

document.getElementById('mortar-options')?.addEventListener('click', (event) => {
  event.preventDefault()
  chrome.runtime.openOptionsPage()
})
