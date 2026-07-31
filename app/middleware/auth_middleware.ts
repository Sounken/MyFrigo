import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

export const SESSION_AUTH_KEY = 'authenticated'

/**
 * Single-user gate. There is no accounts table: the session either carries
 * the flag set by a successful password check, or it does not.
 */
export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (env.get('AUTH_DISABLED', false)) {
      return next()
    }

    if (ctx.session.get(SESSION_AUTH_KEY) !== true) {
      /**
       * An expired session during an XHR would otherwise hand Inertia a
       * login page as a JSON payload. 409 tells the client to hard-redirect.
       */
      if (ctx.request.header('x-inertia')) {
        return ctx.response.status(409).header('x-inertia-location', '/login').send('')
      }
      return ctx.response.redirect('/login')
    }

    return next()
  }
}
