<template lang="pug">
nav-bar
header-bar
  div
    h1 LAYOUT 
    slot
</template>
<script>
import NavBar from "../components/nav-bar";
import HeaderBar from "../components/header-bar";
export default {
  components: { HeaderBar, NavBar }
}
</script>