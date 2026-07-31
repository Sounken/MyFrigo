import { test } from '@japa/runner'
import { applyLocation, matchCategory } from '#services/shelf_life_rules'

test.group('Shelf life rules', () => {
  test('prefers the most specific Open Food Facts category', ({ assert }) => {
    assert.deepEqual(matchCategory(['en:dairies', 'en:yogurts']), {
      days: 21,
      tag: 'en:yogurts',
    })
  })

  test('keeps frozen food for at least six months', ({ assert }) => {
    assert.equal(applyLocation(3, 'freezer'), 180)
    assert.equal(applyLocation(270, 'freezer'), 270)
  })

  test('does not alter fridge and pantry estimates', ({ assert }) => {
    assert.equal(applyLocation(7, 'fridge'), 7)
    assert.equal(applyLocation(30, 'pantry'), 30)
  })
})
