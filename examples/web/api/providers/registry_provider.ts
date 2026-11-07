import type { ApplicationService } from '@adonisjs/core/types'
import { Registry, bind, ok } from '@ufo-soft/caelus'

import CounterService from '#services/counter_service'
import { commands } from '#start/commands'

/**
 * Stands up the command registry as a container singleton, so the invoke route and the
 * ace command share one instance. Handlers call the same CounterService the REST
 * controller calls; neither side knows about the other.
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
}
