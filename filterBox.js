// The Mortar filter box on listing pages of sites whose sidebar Mortar does not draw into (Thunderstore, CurseForge,
// the Vintage Story Mod DB). Its rows flip the same settings as the options page and the Nexus sidebar section.
const mortarFilterKeys = { installed: 'markInstalled', deprecated: 'markObsolete' }

// Rows for the box: Gray out and Hide both read as checked, and Hide is only changed in the options.
globalThis.mortarFilterBoxRows = (settings, specs) =>
  specs.map(({ row, label, count = 0, disabled = false, title = '' }) => {
    const value = settings[mortarFilterKeys[row]]
    const hidden = value === 'hide'
    const shown = hidden ? `(${count} hidden)` : `(${count})`
    return {
      row,
      label,
      checked: value !== 'off',
      disabled: disabled || hidden,
      title: hidden ? 'Hidden by the extension options' : title,
      count: count > 0 ? shown : '',
    }
  })

globalThis.mortarFilterValue = (checked) => (checked ? 'gray' : 'off')

globalThis.mortarRemoveFilterBox = (doc) => doc.getElementById('mortar-filter-box')?.remove()

globalThis.mortarShowFilterBox = (doc, rows) => {
  globalThis.mortarCornerCard(
    doc,
    { id: 'mortar-filter-box', corner: 'bottom-left', column: true },
    (card) => {
      const title = doc.createElement('div')
      title.className = 'title'
      title.append(globalThis.mortarUiMark(doc), 'Mortar')
      card.append(title)
      for (const row of rows) {
        const label = doc.createElement('label')
        label.title = row.title
        label.style.cssText = `display:flex;gap:8px;align-items:center;font-size:13px;${row.disabled ? 'opacity:.5' : 'cursor:pointer'}`
        const input = doc.createElement('input')
        input.type = 'checkbox'
        input.checked = row.checked
        input.disabled = row.disabled
        input.addEventListener('change', (event) => {
          globalThis.mortarIfTrusted(event, () => {
            try {
              chrome.storage.sync.set({
                [mortarFilterKeys[row.row]]: globalThis.mortarFilterValue(input.checked),
              })
            } catch {
              input.checked = !input.checked
            }
          })
        })
        label.append(input, `${row.label} ${row.count}`.trim())
        card.append(label)
      }
    },
  )
}
