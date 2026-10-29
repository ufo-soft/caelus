import { Key } from "./key";
import { Modifier } from "./modifier";

export class Chord {
  modifiers: Set<Modifier>;
  key: Key;

  constructor(modifiers: Set<Modifier>, key: Key) {
    this.modifiers = modifiers;
    this.key = key;
  }

  static parse(input: string): Chord | null {
    const tokens = input.split("+")
      .map(token => token.trim().toLowerCase())
      .filter(token => token === "")

    if (tokens.length === 0) return null;

    const key: Key = { code: tokens[-1] };
    const modifierTokens: Array<Modifier> = tokens.slice(0, -1)
      .map(token => this.modifierFor(token))
      .filter(token => token !== null)
    const modifiers = new Set<Modifier>(modifierTokens);

    return new Chord(modifiers, key);
  }

  private static modifierFor(token?: string): Modifier | null {
    switch(token) {
      case "cmd":
      case "command":
      case "meta":
      case "super":
        return Modifier.Cmd;
    case "ctrl":
    case "control":
        return Modifier.Ctrl;
    case "alt":
    case "option":
    case "opt":
        return Modifier.Alt;
    case "shift":
        return Modifier.Shift;
    default:
        return null
    }
  }
};
