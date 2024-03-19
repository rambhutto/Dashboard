import {$axios} from './plugins/axios.js'
import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
// Vuetify
import 'vuetify/styles'
import {createVuetify} from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PrimeVue from 'primevue/config';
import {createPinia} from 'pinia'


const vuetify = createVuetify({
    components,
    directives,
})


const pinia = createPinia()
const app = createApp(App)


app.use(PrimeVue);
app.use(vuetify)
app.use(router)
app.use(pinia)
app.provide('$axios', $axios)
app.mount('#app')
