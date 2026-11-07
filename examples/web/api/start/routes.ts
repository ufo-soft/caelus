/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The counter is a singleton resource. These routes are the app's own REST
| API; nothing here knows the command registry exists.
|
*/

import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router
  .group(() => {
    router.get('counter', [controllers.Counters, 'show'])
    router.post('counter/increment', [controllers.Counters, 'increment'])
    router.post('counter/decrement', [controllers.Counters, 'decrement'])
    router.delete('counter', [controllers.Counters, 'destroy'])
  })
  .prefix('/api/v1')
