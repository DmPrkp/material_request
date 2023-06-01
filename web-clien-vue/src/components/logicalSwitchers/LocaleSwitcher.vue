<template>
 <select name="locale" @change="(event: any) => setLocale(event.target.value)">
    <option 
        v-for="sLocale in availableLocales"
        :key="sLocale"
        :value="sLocale"
        :selected="locale === sLocale"
        >
        {{ sLocale }}
    </option>
 </select>
</template>

<script setup lang="ts">

import { useI18n } from 'vue-i18n';
import i18n from '@/plugins/i18n';
import { onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const defaultLocale = import.meta.env.VITE_RU_LOCALE

function getAvailableLocales() {
    const envs = import.meta.env
    return Object.keys(envs)
        .filter((key: string) => (new RegExp('LOCAL')).test(key))
        .map(env => envs[env])
}

function setLocale(value: string) { 
    i18n.global.locale.value = value
    document.querySelector("html")?.setAttribute('lang', i18n.global.locale.value)
    localStorage.setItem("user-locale", i18n.global.locale.value)
    if (route.name && value !== route.params.locale) {
        if (route.fullPath === '/') { 
            router.push({ name: 'home', params: { locale: value } }) 
        }
        else router.push({ params: { locale: value } })        
    }
}

function getUserLocale() {
    const persistLocale = localStorage.getItem("user-locale")
    return persistLocale || window.navigator.language || defaultLocale
    
}

function handleLocale(locale: string, availableLocales) {
    const localeNoRegion = locale.split('-')[0]
    if (availableLocales.includes(locale)) { setLocale(locale) }
    else if (availableLocales.includes(localeNoRegion)) { setLocale(localeNoRegion) }
    else { setLocale(defaultLocale) }
}

const availableLocales = getAvailableLocales()

watch(() => route.fullPath, (newVal, oldVal) => {
    if (route.params.locale.constructor === String && oldVal === '/') {
        handleLocale(route?.params?.locale, availableLocales)
    }    
})

onMounted(() => {
    const userLocale = getUserLocale()
    handleLocale(userLocale, availableLocales)
})

</script>