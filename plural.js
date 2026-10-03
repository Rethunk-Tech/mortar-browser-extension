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

globalThis.mortarInstalledReplyStatus = (reply, lastError) => {
  if (lastError || reply?.nativeMessagingError === true) {
    return "Mortar's browser helper is not installed"
  }
  if (!Array.isArray(reply?.modIds)) {
    return 'Mortar could not read this profile'
  }
  if (reply?.connected !== true) {
    if (reply?.connected === false) {
      return 'Open a profile in Mortar'
    }
    return 'Open Mortar on a profile'
  }
  return ''
}
