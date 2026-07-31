import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import env from '#start/env'

const dbConfig = defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: env.get('DB_PATH') ?? app.tmpPath('db.sqlite3'),
      },
      useNullAsDefault: true,
      pool: {
        /**
         * better-sqlite3 is synchronous and a single process owns the file,
         * so one connection sidesteps SQLITE_BUSY entirely.
         */
        min: 1,
        max: 1,
        afterCreate: (conn: any, done: (err: Error | null, connection: any) => void) => {
          conn.pragma('journal_mode = WAL')
          conn.pragma('foreign_keys = ON')
          done(null, conn)
        },
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
