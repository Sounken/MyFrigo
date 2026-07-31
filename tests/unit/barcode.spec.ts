import { test } from '@japa/runner'
import { hasValidChecksum, normalize, parseScan } from '#services/barcode'

test.group('Barcode parsing', () => {
  test('accepts a valid EAN-13 and rejects a changed check digit', ({ assert }) => {
    assert.isTrue(hasValidChecksum('3560071492748'))
    assert.isFalse(hasValidChecksum('3560071492749'))
  })

  test('normalizes UPC-A to its GTIN-13 representation', ({ assert }) => {
    assert.equal(normalize('036000291452'), '0036000291452')
  })

  test('keeps in-store labels away from product APIs', ({ assert }) => {
    const parsed = parseScan('2000000000008')
    assert.equal(parsed.kind, 'in_store')
    assert.isTrue(parsed.validChecksum)
  })

  test('marks incomplete scans as unknown', ({ assert }) => {
    const parsed = parseScan('12345')
    assert.equal(parsed.kind, 'unknown')
    assert.isFalse(parsed.validChecksum)
  })
})
