export const BindingKind = {
  Bound: 'bound',
  Unbound: 'unbound',
}

class Bound {
  readonly kind = BindingKind.Bound;
  constructor(public readonly commandName: string) {}
}

class Unbind {
  readonly kind = BindingKind.Unbound;
}

export type Binding = Bound | Unbind;
