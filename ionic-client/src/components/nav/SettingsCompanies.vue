<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ $t("pages.settings.companies.title") }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <!--
        Компания одна — текущая: по ней показываются склады, выдачи и выбор склада
        в заявке. Остальные не перечисляем, к ним переключаются кнопкой «сменить».
      -->
      <ion-list>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <h2>{{ currentName }}</h2>
            <p>{{ currentRoles }}</p>
          </ion-label>
        </ion-item>
        <ion-item
          v-if="state === 'error'"
          lines="none"
        >
          <ion-label
            class="ion-text-wrap"
            color="danger"
          >
            {{ $t("pages.settings.companies.load_error") }}
          </ion-label>
        </ion-item>
      </ion-list>
      <div class="buttons">
        <CutCornerBtn
          v-if="store.companies.length"
          @click="switchCompany"
        >
          {{ $t("pages.settings.companies.switch") }}
        </CutCornerBtn>
        <CutCornerBtn @click="createCompany">
          {{ $t("pages.settings.companies.create") }}
        </CutCornerBtn>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts" setup>
  /**
   * Текущая компания: одна на всё приложение (store/company.ts), по ней отбираются
   * склады и выдачи. Здесь её видно и можно сменить или завести новую.
   * Показывается только вошедшему: без токена company-server отвечает 401.
   */
  import { alertController } from "@ionic/vue";
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

  const state = computed(() =>
    loaded.value === "error" ? "error" : "list"
  );

  /** Компаний нет — так и пишем: работа идёт с личными складами. */
  const currentName = computed(
    () => store.current?.name ?? t("pages.settings.companies.empty")
  );
  const currentRoles = computed(() =>
    store.current ? rolesLabel(store.current) : ""
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

  /**
   * Выбор — радиокнопками в алерте: он открывается поверх модалки настроек, а
   * отдельный экран увёл бы из неё. Личных складов в списке нет: они не компания,
   * а отдельный раздел на экране складов.
   */
  async function switchCompany() {
    const alert = await alertController.create({
      header: t("pages.settings.companies.switch"),
      inputs: store.companies.map((company) => ({
        type: "radio" as const,
        label: company.name,
        value: String(company.id),
        checked: store.currentId === company.id,
      })),
      buttons: [
        { text: t("ui.buttons.cancel"), role: "cancel" },
        { text: t("ui.buttons.save"), role: "confirm" },
      ],
    });
    await alert.present();
    // Выбор радиокнопки приходит в data.values, а не строкой: как у полей ввода.
    const { role, data } = await alert.onDidDismiss<{ values?: string }>();
    const picked = Number(data?.values);
    if (role !== "confirm" || !Number.isInteger(picked)) return;
    store.setCurrent(picked);
  }

  /**
   * Название — единственное поле, поэтому alert, а не отдельная форма: на телефоне
   * он открывается поверх модалки настроек и не уводит из неё.
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
        header: t("pages.settings.companies.create_error"),
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
    margin-top: 12px;
  }
</style>
