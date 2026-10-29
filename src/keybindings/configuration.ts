import { Chord } from "./chord";
import { Binding, BindingKind } from "./binding";
import { Registry } from "../core";

export class Configuration {
  private patch: Map<Chord, Binding>;
  private base: Map<Chord, Binding>;

  constructor(base: Map<Chord, Binding>) {
    this.base = base;
  }

  resolve(registry: Registry): Map<Chord, Binding> | null {
    const merged = new Map<Chord, Binding>([...this.base, ...this.patch])
    for (const [chord, binding] of merged) {
      switch (binding.kind) {
        case BindingKind.Bound:
          return registry.retrieve(binding.commandName)
            ? new Map<Chord, Binding>([chord, binding])
            : null;
        case BindingKind.Unbound:
            return null;
        default:
          return null;
      }
    }
  }
}
