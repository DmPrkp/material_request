<template>
  <div>
    <!-- Сверху — текущая: по ней показываются склады, выдачи и выбор склада в заявке. -->
    <ion-list>
      <ion-list-header>{{
        $t("pages.settings.companies.current")
      }}</ion-list-header>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>{{ currentName }}</h2>
          <p>{{ currentRoles }}</p>
        </ion-label>
      </ion-item>
      <ion-item v-if="state === 'error'" lines="none">
        <ion-label class="ion-text-wrap" color="danger">
          {{ $t("pages.settings.companies.load_error") }}
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Все свои компании; выбор переключает текущую сразу, без подтверждения. -->
    <ion-list v-if="store.companies.length">
      <ion-list-header>{{
        $t("pages.settings.companies.all")
      }}</ion-list-header>
      <ion-radio-group
        :value="store.currentId"
        @ion-change="pick($event.detail.value)"
      >
        <!--
          button — строка нажимается и подсвечивается как обычный пункт списка.
          Нажатие по строке и по радиокнопке переключают одну и ту же компанию:
          setCurrent с тем же id ничего не меняет, поэтому двойной вызов безвреден.
        -->
        <ion-item
          v-for="company in store.companies"
          :key="company.id"
          button
          :detail="false"
          @click="pick(company.id)"
        >
          <ion-radio slot="start" :value="company.id" />
          <ion-label class="ion-text-wrap">
            <h2>{{ company.name }}</h2>
            <p>{{ rolesLabel(company) }}</p>
          </ion-label>
        </ion-item>
      </ion-radio-group>
    </ion-list>

    <div class="buttons">
      <CutCornerBtn @click="createCompany">
        {{ $t("pages.settings.companies.create") }}
      </CutCornerBtn>
    </div>
  </div>
</template>

<script lang="ts" setup>
  /**
   * Компании: текущая сверху, ниже — все свои списком, выбор переключает текущую.
   * Одна на всё приложение (store/company.ts). Показывается только вошедшему:
   * без токена company-server отвечает 401.
   */
  import {
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRadio,
    IonRadioGroup,
    alertController,
  } from "@ionic/vue";
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import CompanyModel from "@/models/CompanyModel";
  import { useAuthStore } from "@/store/auth";
  import { useCompanyStore } from "@/store/company";
  import { tokenUser } from "@/store/authToken";
  import type { Company } from "@/types/dto";

  const { t } = useI18n();
  const authStore = useAuthStore();
  const store = useCompanyStore();

  const loaded = ref<"loading" | "done" | "error">("loading");

  const state = computed(() => (loaded.value === "error" ? "error" : "list"));

  /** Компаний нет — так и пишем: работа идёт с личными складами. */
  const currentName = computed(
    () => store.current?.name ?? t("pages.settings.companies.empty"),
  );
  const currentRoles = computed(() =>
    store.current ? rolesLabel(store.current) : "",
  );

  async function load() {
    const me = authStore.token ? tokenUser(authStore.token) : undefined;
    await store.load(me?.id);
    loaded.value = store.loaded ? "done" : "error";
  }

  onMounted(load);

  /** Владелец, управление… — в порядке ролей из ответа, через запятую. */
  function rolesLabel(company: Company) {
    return company.roles
      .map((role) => t(`pages.settings.companies.roles.${role}`))
      .join(", ");
  }

  /** Радиокнопка отдаёт id числом; «Личного» в списке нет, поэтому null сюда не приходит. */
  function pick(value: unknown) {
    if (typeof value === "number") store.setCurrent(value);
  }

  /**
   * Название — единственное поле, поэтому alert, а не отдельная форма.
   */
  async function createCompany() {
    const alert = await alertController.create({
      header: t("pages.settings.companies.create"),
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: t("pages.settings.companies.name"),
          attributes: { maxlength: 200 },
        },
      ],
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        {
          text: t("ui.buttons.save"),
          // false — алерт остаётся открытым: пустое название сервис отвергнет (400).
          handler: (values: { name?: string }) => {
            const name = values.name?.trim();
            if (!name) return false;
            void save(name);
          },
        },
      ],
    });
    await alert.present();
  }

  async function save(name: string) {
    try {
      const created = await CompanyModel.create(name);
      // Новая сразу становится текущей: её заводят, чтобы в ней работать.
      store.add(created);
      loaded.value = "done";
    } catch (error) {
      console.error("Не удалось добавить компанию", error);
      const alert = await alertController.create({
        message: t("pages.settings.companies.create_error"),
        buttons: [t("ui.buttons.close")],
      });
      await alert.present();
    }
  }
</script>

<style scoped>
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 16px 0;
  }
</style>
