import { inject } from '@adonisjs/core'
import CounterService from '#services/counter_service'

// A singleton resource. Written as an Adonis developer would, with no knowledge of the registry.
@inject()
export default class CountersController {
  constructor(private counter: CounterService) {}

  async show() {
    return { value: await this.counter.current() }
  }

  async increment() {
    return { value: await this.counter.adjust(1) }
  }

  async decrement() {
    return { value: await this.counter.adjust(-1) }
  }

  async destroy() {
    return { value: await this.counter.reset() }
  }
}
