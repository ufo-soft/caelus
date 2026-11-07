import type { ApplicationService } from '@adonisjs/core/types'
import { Registry, bind, ok } from '@ufo-soft/caelus'

import CounterService from '#services/counter_service'
import { commands } from '../registry/descriptions.js'

/**
 * Stands up the command registry: one per process, shared by every request. Handlers call
 * the same CounterService the REST controller calls; neither side knows about the other.
 * The invoke route is registered here too, so the app's own routes file stays untouched.
 */
export default class RegistryProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(Registry, async (resolver) => {
      const counter = await resolver.make(CounterService)
      const registry = new Registry()
      registry.register(
        bind(commands, {
          increment: async () => ok(await counter.adjust(1)),
          decrement: async () => ok(await counter.adjust(-1)),
          reset: async () => ok(await counter.reset()),
        }),
      )
      return registry
    })
  }

  async start() {
    const router = await this.app.container.make('router')
    router.post('/api/v1/invoke', [() => import('#controllers/invoke_controller')])
  }
}
