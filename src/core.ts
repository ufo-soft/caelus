export type ParameterType = 'string' | 'integer' | 'boolean'

export interface Parameter {
  readonly name: string
  readonly type: ParameterType
  readonly description: string
}

export interface Command {
  readonly description: string
  readonly parameters: readonly Parameter[]
}

export type Args = Readonly<Record<string, unknown>>

export type Outcome =
  | { readonly kind: 'ok'; readonly data: unknown }
  | { readonly kind: 'failed'; readonly reason: string }

export const ok = (data: unknown = null): Outcome => ({ kind: 'ok', data })
export const failed = (reason: string): Outcome => ({ kind: 'failed', reason })

export interface Registration {
  readonly name: string
  readonly command: Command
  readonly handler: (args: Args) => Outcome
}

export class Registry {
  readonly #registrations = new Map<string, Registration>()

  register(registrations: Registration | readonly Registration[]): void {
    for (const r of [registrations].flat()) this.#registrations.set(r.name, r)
  }

  retrieve(name: string): Registration | undefined {
    return this.#registrations.get(name)
  }

  all(): Registration[] {
    return [...this.#registrations.values()]
  }

  invoke(name: string, args: Args): Outcome {
    const registration = this.#registrations.get(name)
    if (!registration) return failed(`no command named ${name}`)
    return registration.handler(args)
  }
}
