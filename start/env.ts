/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Database
  |----------------------------------------------------------
  | Absolute path to the SQLite file. In production it must point inside the
  | persistent volume, otherwise every redeploy wipes the fridge.
  */
  DB_PATH: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Authentication (single user, no accounts table)
  |----------------------------------------------------------
  | Scrypt hash of the one password that opens the app.
  | Generate it with: node ace password:hash "your password"
  */
  APP_PASSWORD_HASH: Env.schema.string.optional(),
  /** Temporary testing switch. Never leave enabled on a public deployment. */
  AUTH_DISABLED: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Open Food Facts
  |----------------------------------------------------------
  | The API filters generic user agents. The format is mandated by OFF:
  | AppName/Version (contact@email)
  */
  OFF_USER_AGENT: Env.schema.string.optional(),
  OFF_BASE_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Web Push (expiry notifications)
  |----------------------------------------------------------
  | Generate a key pair with: node ace push:keys
  | Leave empty to run the app without notifications.
  */
  VAPID_PUBLIC_KEY: Env.schema.string.optional(),
  VAPID_PRIVATE_KEY: Env.schema.string.optional(),
  VAPID_SUBJECT: Env.schema.string.optional(),
})
