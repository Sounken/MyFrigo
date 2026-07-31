import { test } from '@japa/runner'
import { describeAdditives } from '#services/additives'

test.group('Additive reference', () => {
  test('describes common additives with a function and cautious status', ({ assert }) => {
    const [additive] = describeAdditives(['en:e500'])

    assert.equal(additive.code, 'e500')
    assert.equal(additive.name, 'Carbonates de sodium')
    assert.equal(additive.functionLabel, 'Agent levant / correcteur d’acidité')
    assert.equal(additive.riskLevel, 'low')
  })

  test('keeps unknown additives explicitly unclassified', ({ assert }) => {
    const [additive] = describeAdditives(['en:e9999'])

    assert.equal(additive.code, 'e9999')
    assert.equal(additive.riskLevel, 'unknown')
    assert.equal(additive.riskLabel, 'Non classifié')
  })

  test('groups additive variants under one clickable family', ({ assert }) => {
    assert.lengthOf(describeAdditives(['en:e322', 'en:e322i']), 1)
  })
})
