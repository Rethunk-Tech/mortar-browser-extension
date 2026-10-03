document.getElementById('mortar-open-app')?.addEventListener('click', (event) => {
  event.preventDefault()
  const link = document.createElement('a')
  link.href = 'mortar://'
  link.click()
})

document.getElementById('mortar-check-now')?.addEventListener('click', (event) => {
  event.preventDefault()
  chrome.runtime.sendMessage({ type: 'checkNow' }, () => {
    globalThis.mortarReloadPopupUpdates?.()
  })
})
