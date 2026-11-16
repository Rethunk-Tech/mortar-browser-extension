import { expect, test } from 'bun:test'
import './plural.js'
import './hideInProfile.js'

const rowSelectorPrefix = '[data-mortar-row="'

const mortarStubAttribute = (node, selector) => {
  if (selector === '[role="checkbox"]') {
    return node.getAttribute('role') === 'checkbox'
  }
  if (selector === '[data-mortar-row]') {
    return node.dataset.mortarRow !== undefined
  }
  if (selector.startsWith(rowSelectorPrefix)) {
    return node.dataset.mortarRow === selector.slice(rowSelectorPrefix.length, -2)
  }
  return node.tagName === 'BUTTON' && selector === 'button'
}

const mortarStubDescendants = (node) => [node, ...node.children.flatMap(mortarStubDescendants)]

const mortarStubElement = (tag) => {
  const attrs = new Map()
  const node = {
    tagName: tag.toUpperCase(),
    children: [],
    dataset: {},
    className: '',
    textContent: '',
    id: '',
    hidden: false,
    tabIndex: -1,
    listeners: new Map(),
    append: (...kids) => node.children.push(...kids),
    insertBefore: (kid) => node.children.unshift(kid),
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: (name) => attrs.get(name) ?? null,
    addEventListener: (type, fn) => node.listeners.set(type, fn),
    dispatch: (event) => node.listeners.get(event.type)?.(event),
    querySelector: (selector) =>
      node.children.flatMap(mortarStubDescendants).find((c) => mortarStubAttribute(c, selector)),
    querySelectorAll: (selector) =>
      node.children.flatMap(mortarStubDescendants).filter((c) => mortarStubAttribute(c, selector)),
    matches: (selector) => mortarStubAttribute(node, selector),
  }
  return node
}

test('a page script cannot toggle a Hide filter row, a real gesture can', () => {
  const sidebar = mortarStubElement('div')
  sidebar.children.push(mortarStubElement('button'))
  const root = {
    getElementById: (id) => (id === 'filters-panel' ? sidebar : null),
    createElement: mortarStubElement,
    createElementNS: (_ns, tag) => mortarStubElement(tag),
    querySelectorAll: () => [],
  }
  const changes = []
  const wrap = globalThis.mortarEnsureHideInProfileControl(
    root,
    'mortar-hide-in-profile',
    (changedRow, checked) => changes.push([changedRow, checked]),
  )
  const row = wrap.querySelector('[data-mortar-row="obsolete"]')
  const box = row.querySelector('[role="checkbox"]')
  const enter = (isTrusted) => ({
    type: 'keydown',
    key: 'Enter',
    isTrusted,
    preventDefault: () => undefined,
  })
  row.dispatch({ type: 'click', isTrusted: false })
  expect(changes).toEqual([])
  box.dispatch(enter(false))
  expect(changes).toEqual([])
  box.dispatch(enter(true))
  expect(changes).toEqual([['obsolete', true]])
  row.dispatch({ type: 'click', isTrusted: true })
  expect(changes).toEqual([
    ['obsolete', true],
    ['obsolete', true],
  ])
})
