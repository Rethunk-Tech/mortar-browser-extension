import { expect, test } from 'bun:test'
import './modPanel.js'

test('versions order like Mortar: releases above their prereleases, build metadata ignored', () => {
  const newer = globalThis.mortarNewerVersion
  expect(newer('1.2.0', '1.2.0-beta')).toBe(true)
  expect(newer('1.2.0-beta.2', '1.2.0')).toBe(false)
  expect(newer('1.2.0-beta.10', '1.2.0-beta.2')).toBe(true)
  expect(newer('1.2.0+build.9', '1.2.0')).toBe(false)
  expect(newer('v4.10.0', '4.9.9')).toBe(true)
  expect(newer('4.5', '4.5.1')).toBe(false)
  expect(newer('not a version', '1.0.0')).toBe(false)
})
