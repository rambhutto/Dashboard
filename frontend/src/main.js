import {$axios} from './plugins/axios.js'
import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
// Vuetify
import {createPinia} from 'pinia'
import { Quasar } from 'quasar'

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'

// Import Quasar css
import 'quasar/src/css/index.sass'

const pinia = createPinia()
const app = createApp(App)


app.use(Quasar, {
  plugins: {}, // import Quasar plugins and add here
})
app.use(router)
app.use(pinia)
app.provide('$axios', $axios)
app.mount('#app')
