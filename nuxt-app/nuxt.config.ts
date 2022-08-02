import { defineNuxtConfig } from 'nuxt'

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    app: {
        head: {
            link: [
                { rel: 'stylesheet', href: '/css/flex-grid.css' }
            ],
        }
    },
    css: [
        '@/assets/css/index.styl',
    ]
})
