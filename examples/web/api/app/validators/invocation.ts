import vine from '@vinejs/vine'

/** What crosses the invoke route: exactly what registry.invoke() takes. A 200 reply is an Outcome;
 *  anything else is the framework's own error response. */
export const invocationValidator = vine.create(
  vine.object({
    name: vine.string(),
    args: vine.object({}).allowUnknownProperties().optional(),
  }),
)
