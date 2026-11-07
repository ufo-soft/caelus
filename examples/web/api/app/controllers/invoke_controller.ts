import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { Registry } from '@ufo-soft/caelus'

import { invocationValidator } from '#validators/invocation'

// The generic endpoint derived from the registry: any command, present or future, by name.
// Validation is the framework's; a 200 reply is the Outcome as it is.
@inject()
export default class InvokeController {
  constructor(private registry: Registry) {}

  async handle({ request }: HttpContext) {
    const { name, args } = await request.validateUsing(invocationValidator)
    return this.registry.invoke(name, args ?? {})
  }
}
