// The options page: sites, markings and the connection to Mortar. Settings live in chrome.storage.sync under the keys
// settings.js names; every change is saved at once.
const markRows = [
  {
    key: 'markInstalled',
    label: 'Mods in your profile',
    hint: 'Gray out dims them; Hide removes them from the list.',
    choices: [
      ['off', 'Off'],
      ['gray', 'Gray out'],
      ['hide', 'Hide'],
    ],
  },
  {
    key: 'markUpdate',
    label: 'Update available',
    hint: 'A badge on mods in your profile that have a newer file. Not grayed out.',
    choices: [
      ['off', 'Off'],
      ['on', 'Show badge'],
    ],
  },
  {
    key: 'markObsolete',
    label: 'Obsolete mods',
    hint: 'Mods whose author marks them obsolete or deprecated.',
    choices: [
      ['off', 'Off'],
      ['gray', 'Gray out'],
      ['hide', 'Hide'],
    ],
  },
  {
    key: 'markBroken',
    label: 'Broken mods',
    hint: "Mods Mortar's check marks broken for your game version.",
    choices: [
      ['off', 'Off'],
      ['gray', 'Gray out'],
      ['hide', 'Hide'],
    ],
  },
]

const save = (key, value) => chrome.storage.sync.set({ [key]: value })

const buildMarkRows = (settings) => {
  const holder = document.getElementById('mark-rows')
  for (const row of markRows) {
    const set = document.createElement('fieldset')
    const legend = document.createElement('legend')
    legend.textContent = row.label
    const hint = document.createElement('p')
    hint.className = 'hint'
    hint.textContent = row.hint
    const choices = document.createElement('div')
    choices.className = 'choices'
    for (const [value, text] of row.choices) {
      const label = document.createElement('label')
      const input = document.createElement('input')
      input.type = 'radio'
      input.name = row.key
      input.value = value
      input.checked = settings[row.key] === value
      input.addEventListener('change', () => save(row.key, value))
      label.append(input, ` ${text}`)
      choices.append(label)
    }
    set.append(legend, hint, choices)
    holder.append(set)
  }
}

const bindSites = (settings) => {
  for (const box of document.querySelectorAll('input[data-setting]')) {
    box.checked = settings[box.dataset.setting]
    box.addEventListener('change', () => save(box.dataset.setting, box.checked))
  }
}

const paintConnection = (reply, lastError) => {
  const state = globalThis.mortarConnectionState(reply, lastError)
  const text = globalThis.mortarStateText(state)
  document.getElementById('connection-status').textContent = state === 'ready' ? 'Connected' : text
  const mortar = document.getElementById('connection-mortar')
  if (state === 'missing') {
    mortar.textContent = globalThis.mortarInstallHint
  } else {
    // Mortar's replies carry its protocol number, not its app version.
    mortar.textContent = `Protocol ${reply?.protocol ?? 0}`
  }
  document.getElementById('open-mortar').hidden = state === 'missing'
}

const checkConnection = () => {
  document.getElementById('connection-status').textContent = 'Checking…'
  chrome.runtime.sendMessage(globalThis.mortarGameRequest('installed', ''), (reply) => {
    paintConnection(reply, chrome.runtime.lastError)
  })
}

document.getElementById('connection-extension').textContent =
  `version ${chrome.runtime.getManifest().version}, protocol ${globalThis.mortarProtocol}`
document.getElementById('recheck').addEventListener('click', checkConnection)
globalThis.mortarReadSettings().then((settings) => {
  bindSites(settings)
  buildMarkRows(settings)
})
checkConnection()
