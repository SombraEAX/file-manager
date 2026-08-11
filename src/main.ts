import { createApp } from 'vue'
import { installWebPlatform } from './web'

installWebPlatform()

import('./App.vue').then(({ default: App }) => {
  createApp(App).mount('#app')
})
