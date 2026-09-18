<template>
  <!-- click.stop: строка списка сама открывает модалку правки, а здесь нужна только подсказка -->
  <button
    type="button"
    class="unfilled-mark"
    :aria-label="$t('pages.materials.unfilled_hint')"
    @click.stop="showHint"
  >
    <ion-icon :icon="alertCircle" />
  </button>
</template>

<script setup lang="ts">
  import { alertController, IonIcon } from "@ionic/vue";
  import { alertCircle } from "ionicons/icons";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  async function showHint() {
    const alert = await alertController.create({
      header: t("pages.materials.unfilled_hint"),
      buttons: [t("ui.buttons.close")],
    });
    await alert.present();
  }
</script>

<style scoped>
  /* Кнопка на всю ячейку «№»: на телефоне колонка узкая, иконка сама по себе
     была бы мелкой целью для пальца. */
  .unfilled-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    margin: -6px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--orange-01);
    font-size: 24px;
    cursor: pointer;
  }
</style>
