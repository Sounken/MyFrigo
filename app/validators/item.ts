import vine from '@vinejs/vine'

const locations = ['fridge', 'freezer', 'pantry'] as const

export const scanValidator = vine.compile(
  vine.object({
    barcode: vine.string().trim().minLength(6).maxLength(32),
    location: vine.enum(locations).optional(),
  })
)

export const createItemValidator = vine.compile(
  vine.object({
    /**
     * Either an existing product's barcode, or the code just scanned. For a
     * weighed item it can be the barcode of a previously named product, since
     * the in-store code itself is single-use.
     */
    barcode: vine.string().trim().minLength(6).maxLength(32),
    /** Required only when the barcode is unknown to us. */
    name: vine.string().trim().minLength(1).maxLength(120).optional(),
    brands: vine.string().trim().maxLength(120).optional(),
    weighed: vine.boolean().optional(),
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    location: vine.enum(locations).optional(),
    /** Scanning three identical yoghurts creates three rows in one call. */
    quantity: vine.number().min(1).max(50).optional(),
  })
)

export const updateItemValidator = vine.compile(
  vine.object({
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    location: vine.enum(locations).optional(),
  })
)
