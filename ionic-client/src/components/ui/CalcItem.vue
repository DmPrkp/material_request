<template>
    <div class="calc-item_wrapper" @click="$emit('click', item)">
        <h2 class="fb calc-page_menu">{{ $t(`main-menu.${item.title}`) }}</h2>
        <img :src="item.img.src" :alt="item.img.alt" >        
    </div>
</template>

<script lang="ts" setup>
defineProps({ item: Object })
defineEmits(['click'])
</script>

<style>
.calc-item_wrapper {
    width: 50%;
    padding: 5px;
    max-height: 150px;
    overflow: hidden;
}

.calc-item_wrapper > img {
    height: 100%;
}

.calc-page_menu {
    position: absolute;
    margin-left: 0.5rem;
    padding: 0.25rem;
    background-color: rgba(5, 2, 2, 0.712);
    box-shadow: 0px 0px 15px 10px rgba(5, 2, 2, 0.712);
}

</style>