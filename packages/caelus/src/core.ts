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

export type Handler = (args: Args) => Outcome | Promise<Outcome>

export interface Registration {
  readonly name: string
  readonly command: Command
  readonly handler: Handler
}

/** Registrations from shared descriptions and one handler per key. The handler object must have
 *  exactly the described keys, so a command without a handler, or the reverse, fails to compile. */
export function bind<C extends Record<string, Command>>(commands: C, handlers: { [K in keyof C]: Handler }): Registration[] {
  return Object.entries(commands).map(([name, command]) => ({ name, command, handler: handlers[name] }))
}

/** Carries an invoke to a registry in another process. The app supplies it: fetch, a socket, IPC. */
export type Send = (name: string, args: Args) => Promise<Outcome>

/** Registrations for commands whose work happens in another process: every handler sends its name and args
 *  through `send` and returns whatever comes back. */
export function forward(commands: Readonly<Record<string, Command>>, send: Send): Registration[] {
  return Object.entries(commands).map(([name, command]) => ({ name, command, handler: (args) => send(name, args) }))
}

export class Registry {
  readonly #registrations = new Map<string, Registration>()

  register(registrations: Registration | readonly Registration[]): void {
    for (const r of [registrations].flat()) this.#registrations.set(r.name, r)
  }

  /** register(bind(commands, handlers)) */
  bind<C extends Record<string, Command>>(commands: C, handlers: { [K in keyof C]: Handler }): void {
    this.register(bind(commands, handlers))
  }

  /** register(forward(commands, send)) */
  forward(commands: Readonly<Record<string, Command>>, send: Send): void {
    this.register(forward(commands, send))
  }

  retrieve(name: string): Registration | undefined {
    return this.#registrations.get(name)
  }

  all(): Registration[] {
    return [...this.#registrations.values()]
  }

  /** Always a promise, so a handler and a remote registry look the same to the caller.
   *  The handler runs synchronously up to its first await. */
  async invoke(name: string, args: Args): Promise<Outcome> {
    const registration = this.#registrations.get(name)
    if (!registration) return failed(`no command named ${name}`)
    return registration.handler(args)
  }
}
