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

export const OK = 'ok'
export const FAILED = 'failed'

/** A fallible step's result as a value. Carries no context about what it was the outcome of. */
export type Outcome<T = unknown> =
  | { readonly kind: typeof OK; readonly data: T }
  | { readonly kind: typeof FAILED; readonly reason: string }

export const ok = <T = null>(data: T = null as T): Outcome<T> => ({ kind: OK, data })
export const failed = (reason: string): Outcome<never> => ({ kind: FAILED, reason })

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
