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

/** Unauthenticated on purpose: Coolify polls this to decide if the container is up. */
router.get('/health', ({ response }) => response.ok({ status: 'ok' }))

router.get('/login', [AuthController, 'showLogin']).as('login.show')
router.post('/login', [AuthController, 'login']).as('login')
router.post('/logout', [AuthController, 'logout']).as('logout')

router
  .group(() => {
    router.get('/', [InventoryController, 'index']).as('inventory')
    router.get('/scan', [ScanController, 'show']).as('scan')

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

        router.post('/push/subscribe', [PushController, 'subscribe'])
        router.post('/push/unsubscribe', [PushController, 'unsubscribe'])
      })
      .prefix('/api')
  })
  .use(middleware.auth())
