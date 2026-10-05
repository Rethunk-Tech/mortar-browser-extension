// The extension's settings, kept in chrome.storage.sync and edited on the options page. Every content script reads
// them through here, so a value that is missing or unreadable means its default.
globalThis.mortarSettingDefaults = {
  siteNexus: true,
  siteThunderstore: true,
  // What a listing does with mods in the open profile, marked obsolete or marked broken: Off, Gray out or Hide, the
  // same three states as Mortar's Browse filters.
  markInstalled: 'gray',
  markObsolete: 'off',
  markBroken: 'off',
  // The "Update available" badge on mods in the open profile.
  markUpdate: 'on',
}

const mortarMarkStates = ['off', 'gray', 'hide']

globalThis.mortarNormalizeSettings = (raw) => {
  const defaults = globalThis.mortarSettingDefaults
  const out = {}
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = raw?.[key]
    if (typeof fallback === 'boolean') {
      out[key] = typeof value === 'boolean' ? value : fallback
    } else if (key === 'markUpdate') {
      out[key] = value === 'off' || value === 'on' ? value : fallback
    } else {
      out[key] = mortarMarkStates.includes(value) ? value : fallback
    }
  }
  return out
}

globalThis.mortarReadSettings = () =>
  new Promise((resolve) => {
    try {
      chrome.storage.sync.get(globalThis.mortarSettingDefaults, (result) => {
        resolve(globalThis.mortarNormalizeSettings(chrome.runtime.lastError ? undefined : result))
      })
    } catch {
      resolve(globalThis.mortarNormalizeSettings(undefined))
    }
  })

// The listing's installed-mark mode from the installed row: Gray out keeps the in-profile outline and dims, which is
// the content script's "highlight" mode with the gray filter on.
globalThis.mortarInstalledMode = (settings) =>
  ({ off: 'off', hide: 'hide', gray: 'highlight' })[settings.markInstalled] ?? 'highlight'

// Runs start on a page whose site is switched on in the options; a site that is off stays untouched.
globalThis.mortarWhenSiteEnabled = (key, start) => {
  globalThis.mortarReadSettings().then((settings) => {
    if (settings[key]) {
      start()
    }
  })
}
