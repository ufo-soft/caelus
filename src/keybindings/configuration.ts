import { Chord } from "./chord";
import { Binding, Bound } from "./binding";
import { Registry } from "../core";

export class Configuration {
  private patch: Map<Chord, Binding> = new Map();
  private base: Map<Chord, Binding>;

  constructor(base: Map<Chord, Binding>) {
    this.base = base;
  }

  applyPatch(patch: Map<Chord, Binding>) {
    this.patch = patch
  }

  resolve(registry: Registry): Map<Chord, Binding> {
    const merged = new Map<Chord, Binding>([...this.base, ...this.patch])
    const result = new Map<Chord, Binding>;
    for (const [chord, binding] of merged) {
      if (binding instanceof Bound && registry.retrieve(binding.commandName) != null) result.set(chord, binding)
    }
    return result;
  }
}
