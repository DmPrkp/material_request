<template>
    <nav>
        <LocaleSwitcher></LocaleSwitcher>         
        <ul>
            <li>
                <RouterLink :to="{ name: 'home', params: { locale: $route.params.locale || 'ru' }}">
                  {{ $t("message", {name: 'test'}) }}
                </RouterLink>
            </li>
            <li>
                <RouterLink :to="{ name: 'about', params: { locale: $route.params.locale || 'ru' }}">
                  о нас
                </RouterLink>
            </li>
        </ul>
    </nav>
</template>

<script lang="ts">
import LocaleSwitcher from '../logicalSwitchers/LocaleSwitcher.vue';
export default {
  data() {
    return { count: 0 }
  },
  components: {
    LocaleSwitcher
  }
}
</script>