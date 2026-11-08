import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ForceJsonResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    // a client that already accepts JSON keeps its Accept header; MCP over streamable HTTP sends
    // JSON and text/event-stream together, and the SDK rejects a request missing either
    if (!ctx.request.header('accept')?.includes('application/json')) {
      ctx.request.request.headers.accept = 'application/json'
    }
    return next()
  }
}
