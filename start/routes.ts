/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const InventoryController = () => import('#controllers/inventory_controller')
const ItemsController = () => import('#controllers/items_controller')
const ScanController = () => import('#controllers/scan_controller')
const PushController = () => import('#controllers/push_controller')
const StatsController = () => import('#controllers/stats_controller')
const HistoryController = () => import('#controllers/history_controller')
const ShoppingController = () => import('#controllers/shopping_controller')
const SettingsController = () => import('#controllers/settings_controller')

/** Unauthenticated on purpose: Coolify polls this to decide if the container is up. */
router.get('/health', ({ response }) => response.ok({ status: 'ok' }))

router.get('/login', [AuthController, 'showLogin']).as('login.show')
router.post('/login', [AuthController, 'login']).as('login')
router.post('/logout', [AuthController, 'logout']).as('logout')

router
  .group(() => {
    router.get('/', [InventoryController, 'index']).as('inventory')
    router.get('/scan', [ScanController, 'show']).as('scan')
    router.get('/stats', [StatsController, 'index']).as('stats')
    router.get('/history', [HistoryController, 'index']).as('history')
    router.get('/shopping', [ShoppingController, 'index']).as('shopping')
    router.get('/settings', [SettingsController, 'index']).as('settings')
    router.get('/api/export', [SettingsController, 'export']).as('export')

    router
      .group(() => {
        router.post('/scan', [ScanController, 'resolve'])

        router.post('/items', [ItemsController, 'store'])
        router.patch('/items/:id', [ItemsController, 'update'])
        router
          .post('/items/:id/:status', [ItemsController, 'resolve'])
          .where('status', /^(consumed|trashed)$/)
        router.post('/items/:id/restore', [ItemsController, 'restore'])
        router.delete('/items/:id', [ItemsController, 'destroy'])
        router.get('/stats', [ItemsController, 'stats'])

        router.post('/shopping', [ShoppingController, 'store'])
        router.patch('/shopping/:id', [ShoppingController, 'update'])
        router.delete('/shopping/checked', [ShoppingController, 'clearChecked'])
        router.delete('/shopping/:id', [ShoppingController, 'destroy'])

        router.post('/push/subscribe', [PushController, 'subscribe'])
        router.post('/push/unsubscribe', [PushController, 'unsubscribe'])
      })
      .prefix('/api')
  })
  .use(middleware.auth())
