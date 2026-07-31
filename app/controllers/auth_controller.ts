import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'
import env from '#start/env'
import { SESSION_AUTH_KEY } from '#middleware/auth_middleware'
import { clearFailures, isLocked, recordFailure } from '#services/login_throttle'

const loginValidator = vine.compile(
  vine.object({
    password: vine.string().minLength(1),
  })
)

export default class AuthController {
  showLogin({ inertia, session, response }: HttpContext) {
    if (env.get('AUTH_DISABLED', false) || session.get(SESSION_AUTH_KEY) === true) {
      return response.redirect('/')
    }
    return inertia.render('login')
  }

  async login({ request, response, session }: HttpContext) {
    if (env.get('AUTH_DISABLED', false)) {
      return response.redirect('/')
    }

    const passwordHash = env.get('APP_PASSWORD_HASH')
    if (!passwordHash) {
      session.flash('error', 'APP_PASSWORD_HASH is not set. Run: node ace password:hash "…"')
      return response.redirect().back()
    }

    const key = request.ip()
    const lockedFor = isLocked(key)
    if (lockedFor > 0) {
      session.flash('error', `Trop de tentatives. Réessaie dans ${Math.ceil(lockedFor / 60)} min.`)
      return response.redirect().back()
    }

    const { password } = await request.validateUsing(loginValidator)

    if (!(await hash.verify(passwordHash, password))) {
      recordFailure(key)
      session.flash('error', 'Mot de passe incorrect.')
      return response.redirect().back()
    }

    clearFailures(key)
    /** New session id on privilege change, to close off session fixation. */
    await session.regenerate()
    session.put(SESSION_AUTH_KEY, true)

    return response.redirect('/')
  }

  async logout({ response, session }: HttpContext) {
    session.forget(SESSION_AUTH_KEY)
    await session.regenerate()
    return response.redirect('/login')
  }
}
