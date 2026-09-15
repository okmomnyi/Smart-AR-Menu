import { z, ZodType } from 'zod'
import { badRequest } from './http-error'

/**
 * Parses `data` or throws a 400 whose message names the offending field.
 * Keeps controllers free of hand-rolled `typeof x !== 'string'` checks.
 */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first.path.join('.')
    throw badRequest(path ? `${path}: ${first.message}` : first.message)
  }
  return result.data
}

const trimmed = (max: number) => z.string().trim().min(1).max(max)

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email('Must be a valid email address')

// Only http(s), and no credentials in the URL. Stops javascript:/data: URLs
// from reaching an <img src> or an anchor on the public menu.
export const httpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        (url.protocol === 'https:' || url.protocol === 'http:') &&
        !url.username &&
        !url.password
      )
    } catch {
      return false
    }
  }, 'Must be a valid http(s) URL')

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour such as #D4820A')

export const uuidSchema = z.string().uuid('Must be a valid id')

export const sizeEntrySchema = z.object({
  label: trimmed(24),
  cm: z.number().finite().min(0.1).max(1000),
  price: z.number().finite().min(0).max(1_000_000),
})

export const sizesSchema = z
  .array(sizeEntrySchema)
  .min(1, 'At least one size is required')
  .max(12, 'At most 12 sizes')
  .refine(
    (sizes) => new Set(sizes.map((s) => s.label.toLowerCase())).size === sizes.length,
    'Size labels must be unique'
  )

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  restaurantName: trimmed(80),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
})

export const restaurantUpdateSchema = z
  .object({
    name: trimmed(80).optional(),
    theme_color: hexColorSchema.optional(),
    logo_url: httpUrlSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No fields to update')

export const categoryCreateSchema = z.object({
  name: trimmed(60),
  order: z.number().int().min(0).max(9999).optional(),
})

export const categoryUpdateSchema = z
  .object({
    name: trimmed(60).optional(),
    order: z.number().int().min(0).max(9999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No fields to update')

export const categoryReorderSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(200),
})

const productCore = {
  name: trimmed(120),
  description: z.string().trim().max(2000).nullable().optional(),
  category_id: uuidSchema.nullable().optional(),
  model_url: httpUrlSchema.nullable().optional(),
  image_url: httpUrlSchema.nullable().optional(),
  diameter_cm: z.number().finite().min(0).max(1000).nullable().optional(),
  height_cm: z.number().finite().min(0).max(1000).nullable().optional(),
  sizes: sizesSchema,
  active: z.boolean().optional(),
}

export const productCreateSchema = z.object(productCore)

export const productUpdateSchema = z
  .object({
    ...productCore,
    name: trimmed(120).optional(),
    sizes: sizesSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No fields to update')

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Invalid menu address')

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
