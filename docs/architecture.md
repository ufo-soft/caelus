# Architecture

Core only. Adapters are out of scope for now, so this is the whole picture.

## Types

A `Registry` holds `Registration`s keyed by name; each pairs a self-describing
`Command` with the handler that runs it. Handlers take a loosely-typed argument
map and return an `Outcome` — the narrow waist every surface translates to and
from.

```mermaid
classDiagram
    class Registry {
        -Map~string, Registration~ registrations
        +register(Registration | Registration[])
        +retrieve(string) Registration?
        +all() Registration[]
        +invoke(string, Args) Outcome
    }

    class Registration {
        +string name
        +Command command
        +handler(Args) Outcome
    }

    class Command {
        +string description
        +Parameter[] parameters
    }

    class Parameter {
        +string name
        +ParameterType type
        +string description
    }

    class ParameterType {
        <<union>>
        'string'
        'integer'
        'boolean'
    }

    class Outcome {
        <<union>>
    }
    class Ok {
        +kind 'ok'
        +unknown data
    }
    class Failed {
        +kind 'failed'
        +string reason
    }

    Registry o-- "0..*" Registration : by name
    Registration *-- Command
    Command *-- "0..*" Parameter
    Parameter --> ParameterType
    Outcome <|.. Ok
    Outcome <|.. Failed
    Registration ..> Outcome : handler returns
```

## One registry, many surfaces

Commands are registered once. Every surface dispatches the *same* handlers
through `Registry.invoke` — this is the core thesis. The prototype ran it
across four surfaces off one set of registrations; none of those adapters
exist here yet, but the shape core presents to them is unchanged.

```mermaid
graph TD
    reg["registerCommands(registry)<br/>(defined once)"] --> registry["Registry"]

    gui["GUI button / gesture"] --> registry
    key["key press"] --> registry
    tool["MCP tools/call"] --> registry
    sub["CLI subcommand"] --> registry

    registry --> invoke["invoke(name, args) → Outcome"]

    classDef hub fill:#fff3e0,stroke:#f57c00;
    class registry,invoke hub;
```

Dispatch is by-name at the command level only. The registry is a symbol table:
command *names* are string-keyed and the lookup is fallible, but the handler
behind a found command is already bound as a value at registration — so the
classic resolve-name-then-resolve-function two-step collapses to one fallible
step.