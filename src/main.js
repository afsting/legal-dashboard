import { createApp } from 'vue'
import { Amplify } from 'aws-amplify'
import awsconfig from './amplifyconfiguration.json'
import router from './router'
import './style.css'
import App from './App.vue'

// Configure Amplify
Amplify.configure(awsconfig)

const app = createApp(App)
app.use(router)
app.mount('#app')
