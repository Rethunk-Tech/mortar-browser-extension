// The one look every page Mortar draws on shares: the website's colours, Mortar's accent and mark, one card, button
// and badge. Each element lives in a closed shadow root, so the site's styles cannot reach it; the listing marks sit
// in the site's own markup and take the same colours as plain values.

const mortarUiAccentDefault = 'rgb(214, 177, 122)'

globalThis.mortarUiTokens = `
  --mortar-bg: rgb(17, 17, 20);
  --mortar-raised: rgb(27, 27, 33);
  --mortar-raised2: rgb(36, 36, 44);
  --mortar-accent: ${mortarUiAccentDefault};
  --mortar-accent-ink: rgb(25, 25, 30);
  --mortar-ink: rgba(255, 255, 255, 0.93);
  --mortar-dim: rgba(210, 210, 215, 0.82);
  --mortar-line: rgba(255, 255, 255, 0.12);
  --mortar-good: rgb(147, 184, 106);
  --mortar-warn: rgb(240, 180, 60);
  --mortar-error: rgb(220, 60, 60);
`

// The card, button and mark every Mortar element draws with.
globalThis.mortarUiCss = `
:host { all: initial; ${globalThis.mortarUiTokens} }
.card {
  box-sizing: border-box; display: flex; align-items: center; gap: 10px;
  max-width: min(420px, calc(100vw - 32px)); padding: 10px 12px;
  border-radius: 10px; border: 1px solid var(--mortar-line);
  background: var(--mortar-raised); color: var(--mortar-ink);
  font: 14px/1.35 system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
.card.column { flex-direction: column; align-items: stretch; gap: 6px; }
.title { display: flex; align-items: center; gap: 8px; font-weight: 700; }
.text { flex: 1; min-width: 0; }
.mark { flex: none; display: block; color: var(--mortar-accent); }
.mark rect { fill: currentColor; }
.btn {
  flex: none; height: 30px; padding: 0 12px; border-radius: 7px;
  border: 1px solid var(--mortar-line); background: var(--mortar-raised2); color: var(--mortar-ink);
  font: 600 13px system-ui, sans-serif; cursor: pointer;
}
.btn.primary { border-color: transparent; background: var(--mortar-accent); color: var(--mortar-accent-ink); }
.btn:disabled { opacity: 0.6; cursor: default; }
.btn:focus-visible, input:focus-visible { outline: 2px solid var(--mortar-accent); outline-offset: 2px; }
input[type="checkbox"] { accent-color: var(--mortar-accent); }
`

const mortarUiMarkText =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true" class="mark"><rect x="6" y="12" width="24" height="11" rx="2"/><rect x="34" y="12" width="24" height="11" rx="2"/><rect x="6" y="27" width="10" height="11" rx="2"/><rect x="20" y="27" width="24" height="11" rx="2"/><rect x="48" y="27" width="10" height="11" rx="2"/><rect x="6" y="42" width="24" height="11" rx="2"/><rect x="34" y="42" width="24" height="11" rx="2"/></svg>'
let mortarUiMarkSvg

// The logo's bricks, parsed once; each use is a copy.
globalThis.mortarUiMark = (doc) => {
  if (!mortarUiMarkSvg) {
    mortarUiMarkSvg = new DOMParser().parseFromString(
      mortarUiMarkText,
      'image/svg+xml',
    ).documentElement
  }
  return doc.importNode(mortarUiMarkSvg, true)
}

// Mortar's accent colour, from the latest native-host reply; every Mortar element on the page follows it.
let mortarUiAccent = ''
const mortarUiHosts = new Set()
const mortarUiAccentHex = /^#[0-9a-f]{6}$/i

globalThis.mortarUiFollowAccent = (host) => {
  mortarUiHosts.add(host)
  if (mortarUiAccent) {
    host.style.setProperty('--mortar-accent', mortarUiAccent)
  }
}

globalThis.mortarSetAccent = (hex) => {
  if (typeof hex !== 'string' || !mortarUiAccentHex.test(hex) || hex === mortarUiAccent) {
    return
  }
  mortarUiAccent = hex
  for (const host of mortarUiHosts) {
    if (host.isConnected) {
      host.style.setProperty('--mortar-accent', hex)
    } else {
      mortarUiHosts.delete(host)
    }
  }
}

globalThis.mortarUiButton = (doc, label, primary = false) => {
  const button = doc.createElement('button')
  button.type = 'button'
  button.className = primary ? 'btn primary' : 'btn'
  button.textContent = label
  return button
}

const mortarUiCorners = {
  'bottom-right': 'right:16px;bottom:16px',
  'bottom-left': 'left:16px;bottom:16px',
}

// A Mortar card fixed in a corner of the page, replacing any earlier one with the same id; `fill` adds its content
// after the Mortar mark (a column card draws its own title). Returns the card, or null when the page has no body yet.
globalThis.mortarCornerCard = (doc, { id, corner, column = false }, fill) => {
  doc.getElementById(id)?.remove()
  if (!doc.body) {
    return null
  }
  const host = doc.createElement('div')
  host.id = id
  host.style.cssText = `position:fixed;${mortarUiCorners[corner]};z-index:2147483647`
  globalThis.mortarUiFollowAccent(host)
  const root = host.attachShadow({ mode: 'closed' })
  const style = doc.createElement('style')
  style.textContent = globalThis.mortarUiCss
  const card = doc.createElement('div')
  card.className = column ? 'card column' : 'card'
  card.setAttribute('role', 'status')
  if (!column) {
    card.append(globalThis.mortarUiMark(doc))
  }
  fill(card)
  root.append(style, card)
  doc.body.append(host)
  return card
}

// The badge and outline that mark a mod in a site's own listing, as plain colours: the site's styles hold no Mortar
// variables. `update` marks a mod with a newer version.
globalThis.mortarUiListingCss = ({ marker, badge }) => `
  .${marker} { outline: 2px solid ${mortarUiAccentDefault} !important; outline-offset: -2px; position: relative; }
  .${badge} {
    background: ${mortarUiAccentDefault}; color: rgb(25, 25, 30); border-radius: 5px; display: inline-block;
    font: 700 11px/1.4 system-ui, sans-serif; letter-spacing: 0.02em; margin: 4px; padding: 2px 6px;
    position: relative; z-index: 1;
  }
  .${badge}-update { background: rgb(240, 180, 60); }
`

// Mods a listing filter greys out, and how they come back on hover.
globalThis.mortarUiDimCss = (classes) => {
  const list = classes.map((c) => `.${c}`).join(', ')
  const hover = classes.map((c) => `.${c}:hover`).join(', ')
  return `
  ${list} { opacity: 0.35; filter: grayscale(1); transition: opacity 120ms, filter 120ms; }
  ${hover} { opacity: 0.85; filter: grayscale(0.4); }
`
}

// Takes over a site's own install button while Mortar can install the mod: it shows the Mortar mark and `label` in
// Mortar's colours, and a real click runs `onInstall(setLabel)` instead of the site's link. `installed` shows the
// button as done. mortarReleaseSiteButtons puts every claimed button back as the site drew it.
const mortarUiClaimed = new Map()

globalThis.mortarClaimSiteButton = (link, { label, installed = false, onInstall }) => {
  if (!mortarUiClaimed.has(link)) {
    const onClick = (event) => {
      const claim = mortarUiClaimed.get(link)
      if (!claim) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      if (claim.installed || !event.isTrusted) {
        return
      }
      claim.onInstall((said) => {
        link.querySelector('.mortar-claim-label').textContent = said
      })
    }
    mortarUiClaimed.set(link, {
      html: link.innerHTML,
      style: link.getAttribute('style'),
      title: link.getAttribute('title'),
      onClick,
    })
    link.addEventListener('click', onClick, true)
  }
  const claim = mortarUiClaimed.get(link)
  Object.assign(claim, { installed, onInstall })
  const mark = globalThis.mortarUiMark(link.ownerDocument)
  mark.setAttribute('fill', 'currentColor')
  mark.setAttribute('width', '1.15em')
  mark.setAttribute('height', '1.15em')
  mark.style.cssText = 'flex:none;margin-right:0.45em'
  const text = link.ownerDocument.createElement('span')
  text.className = 'mortar-claim-label'
  text.textContent = label
  link.replaceChildren(mark, text)
  link.title = installed ? 'This mod is in your open Mortar profile' : 'Install with Mortar'
  link.style.cssText = installed
    ? 'background:rgb(36,36,44)!important;color:rgba(255,255,255,0.93)!important;border-color:rgba(255,255,255,0.12)!important;box-shadow:none!important;cursor:default;display:inline-flex;align-items:center;justify-content:center'
    : `background:${mortarUiAccent || mortarUiAccentDefault}!important;color:rgb(25,25,30)!important;border-color:transparent!important;box-shadow:none!important;display:inline-flex;align-items:center;justify-content:center`
}

globalThis.mortarReleaseSiteButtons = () => {
  for (const [link, claim] of mortarUiClaimed) {
    link.removeEventListener('click', claim.onClick, true)
    link.innerHTML = claim.html
    for (const [name, value] of [
      ['style', claim.style],
      ['title', claim.title],
    ]) {
      if (value === null) {
        link.removeAttribute(name)
      } else {
        link.setAttribute(name, value)
      }
    }
  }
  mortarUiClaimed.clear()
}
