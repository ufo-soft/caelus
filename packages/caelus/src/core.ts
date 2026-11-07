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

/** Descriptions keyed by name: what an app declares once and every process binds handlers to. */
export type Commands = Readonly<Record<string, Command>>

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

/** One handler per described key, none optional. Descriptions typed as a plain Commands (`string` keys)
 *  can't be checked, so they're rejected outright: declare them with `satisfies Commands` instead. */
export type Handlers<C extends Commands> = string extends keyof C ? never : { [K in keyof C]-?: Handler }

/** Registrations from shared descriptions and one handler per key. A described command without a
 *  handler fails to compile; a handler written inline for an undescribed command does too. */
export function bind<C extends Commands>(commands: C, handlers: Handlers<C>): Registration[] {
  return Object.entries(commands).map(([name, command]) => ({ name, command, handler: handlers[name] }))
}

/** Carries an invoke to a registry in another process. The app supplies it: fetch, a socket, IPC. */
export type Send = (name: string, args: Args) => Promise<Outcome>

/** Registrations for commands whose work happens in another process: every handler sends its name and args
 *  through `send` and returns whatever comes back. */
export function forward(commands: Commands, send: Send): Registration[] {
  return Object.entries(commands).map(([name, command]) => ({ name, command, handler: (args) => send(name, args) }))
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

  /** Always a promise, so a handler and a remote registry look the same to the caller.
   *  The handler runs synchronously up to its first await. */
  async invoke(name: string, args: Args): Promise<Outcome> {
    const registration = this.#registrations.get(name)
    if (!registration) return failed(`no command named ${name}`)
    return registration.handler(args)
  }
}
