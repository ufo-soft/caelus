import vine from '@vinejs/vine'

/** What crosses the invoke route: exactly what registry.invoke() takes. The reply is an Outcome. */
export const invocationValidator = vine.create(
  vine.object({
    name: vine.string(),
    args: vine.object({}).allowUnknownProperties().optional(),
  }),
)
