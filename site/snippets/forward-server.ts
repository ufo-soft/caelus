import { createServer } from 'node:http'
import { text } from 'node:stream/consumers'
import { Registry, bind, failed, ok } from '@ufo-soft/caelus'

import { commands } from './descriptions.js'

let count = 0
const registry = new Registry()
registry.register(
  bind(commands, {
    increment: () => ok(++count),
    decrement: () => ok(--count),
    reset: () => ok((count = 0)),
  }),
)

// POST /invoke with { name, args }; the reply is the outcome as JSON
createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/invoke') return void response.writeHead(404).end()
  const body = await text(request)
    .then(JSON.parse)
    .catch(() => null)
  const outcome =
    typeof body?.name === 'string'
      ? await registry.invoke(body.name, body.args ?? {})
      : failed('expected a JSON body { name, args }')
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(outcome))
}).listen(3000)
