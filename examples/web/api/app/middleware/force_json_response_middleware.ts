import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ForceJsonResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    // a client that can take a stream (MCP over streamable HTTP, SSE) keeps its Accept header
    if (!ctx.request.header('accept')?.includes('text/event-stream')) {
      ctx.request.request.headers.accept = 'application/json'
    }
    return next()
  }
}
