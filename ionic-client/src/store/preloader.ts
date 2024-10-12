import { defineStore } from "pinia";
import { Ref, ref } from "vue";

export const usePreloader = defineStore("preloader", () => {
  const state: Ref<boolean, boolean> = ref(false);
  function setPreloader(val: boolean): void {
    state.value = val;
  }

  return { state, setPreloader };
});
