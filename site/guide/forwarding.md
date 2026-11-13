# Forwarding

`forward(commands, send)` registers commands whose handlers run in another process. Each forwarder
sends the command's name and args through `send` and returns the outcome that comes back. The app
supplies `send`: a fetch, an IPC call, a socket message.

The two processes share the commands' descriptions, in a file that holds data only:

<<< @/snippets/descriptions.ts

## The sending process

<<< @/snippets/forward-client.ts#send

`send` has the type `Send`: `(name, args) => Promise<Outcome>`. A transport failure should come back
as a `failed` outcome, as above. A `send` that throws rejects the promise `invoke` returns.

Any surface works on a registry of forwarders. As a CLI:

<<< @/snippets/forward-client.ts#cli

```txt
$ counter increment
1
$ counter increment
2
$ counter decrement
1
```

With the server down, the forwarder's `failed` outcome becomes the CLI's error:

```txt
$ counter increment
fetch failed
```

## The receiving process

The other process binds handlers to the same descriptions and invokes its own registry with what
arrives:

<<< @/snippets/forward-server.ts

The receiving end is a trust boundary. Check the shape of what arrives before invoking, as above.
The registry checks only that the name exists: the handlers check their own args.

An outcome is plain data, so it crosses the boundary as JSON. Data a handler returns has to survive
that trip: no functions, class instances, or `Date` objects that the other side expects back as
they were.

## Mixing local and forwarded commands

One registry can hold both. A page can forward its data commands to a server and register a
command that only touches the page, such as clearing a log, with a local handler. Every surface sees
one list of commands either way.

See [the examples](../architecture/examples.md) for forwarding over Electron IPC and over a REST
client.
