import { test } from '@japa/runner'
import { calculateProductQuality } from '#services/product_quality'

const known = (score: number, title: string) => ({
  status: 'known' as const,
  score,
  title,
  description: null,
})

test.group('Product quality', () => {
  test('weights nutrition at 60% and processing/additives at 20%', ({ assert }) => {
    const quality = calculateProductQuality({
      nutrition: known(80, 'Nutri-Score B'),
      nova: known(50, 'NOVA 3'),
      additives: known(100, 'Sans additifs'),
    })

    assert.equal(quality.score, 78)
    assert.equal(quality.coverage, 100)
    assert.isFalse(quality.partial)
  })

  test('marks a score as partial and does not punish missing data', ({ assert }) => {
    const quality = calculateProductQuality({
      nutrition: known(20, 'Nutri-Score E'),
      nova: null,
      additives: known(100, 'Sans additifs'),
    })

    assert.equal(quality.score, 40)
    assert.equal(quality.coverage, 80)
    assert.isTrue(quality.partial)
  })

  test('does not publish a score without nutritional data', ({ assert }) => {
    const quality = calculateProductQuality({
      nutrition: null,
      nova: known(100, 'NOVA 1'),
      additives: known(100, 'Sans additifs'),
    })

    assert.isNull(quality.score)
  })

  test('does not turn an additive count into a toxicity penalty', ({ assert }) => {
    const quality = calculateProductQuality({
      nutrition: known(80, 'Nutri-Score B'),
      nova: known(70, 'NOVA 2'),
      additives: {
        ...known(40, '3 additifs détectés'),
        basis: 'count',
      },
    })

    assert.equal(quality.score, 78)
    assert.isNull(quality.components.find((component) => component.id === 'additives')?.score)
  })
})
