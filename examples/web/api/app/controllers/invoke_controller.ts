import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { Registry } from '@ufo-soft/caelus'

import { invocationValidator } from '#validators/invocation'

// The generic endpoint derived from the registry: any command, present or future, by name.
// Validation is the framework's; the Outcome goes back as it is.
@inject()
export default class InvokeController {
  constructor(private registry: Registry) {}

  async store({ request }: HttpContext) {
    const { name, args } = await request.validateUsing(invocationValidator)
    return this.registry.invoke(name, args ?? {})
  }
}
