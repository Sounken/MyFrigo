import vine from '@vinejs/vine'

export const createShoppingItemValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(120),
    barcode: vine.string().trim().minLength(6).maxLength(32).optional(),
  })
)

export const updateShoppingItemValidator = vine.compile(
  vine.object({
    checked: vine.boolean(),
  })
)
