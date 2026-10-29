export class Bound {
  constructor(public readonly commandName: string) {}
}

export class Unbind {}

export type Binding = Bound | Unbind;
