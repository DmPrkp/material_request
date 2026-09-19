<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ $t("pages.settings.companies.title") }}
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ion-list>
        <ion-item
          v-for="company in companies"
          :key="company.id"
        >
          <ion-label class="ion-text-wrap">
            <h2>{{ company.name }}</h2>
            <p>{{ rolesLabel(company) }}</p>
          </ion-label>
        </ion-item>
        <ion-item
          v-if="state === 'empty'"
          lines="none"
        >
          <ion-label class="ion-text-wrap">
            <p>{{ $t("pages.settings.companies.empty") }}</p>
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
      <CutCornerBtn
        class="create_btn"
        @click="createCompany"
      >
        {{ $t("pages.settings.companies.create") }}
      </CutCornerBtn>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts" setup>
  /**
   * Компании, где пользователь участник (company-server отдаёт только их), и его роли
   * в каждой. Показывается только вошедшему: без токена сервис отвечает 401.
   */
  import { alertController } from "@ionic/vue";
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import CompanyModel from "@/models/CompanyModel";
  import type { Company } from "@/types/dto";

  const { t } = useI18n();

  const companies = ref<Company[]>([]);
  const loaded = ref<"loading" | "done" | "error">("loading");

  const state = computed(() => {
    if (loaded.value === "error") return "error";
    if (loaded.value === "done" && !companies.value.length) return "empty";
    return "list";
  });

  async function load() {
    const items = await CompanyModel.listMine();
    if (!items) {
      loaded.value = "error";
      return;
    }
    companies.value = items;
    loaded.value = "done";
  }

  onMounted(load);

  /** Владелец, управление… — в порядке ролей из ответа, через запятую. */
  function rolesLabel(company: Company) {
    return company.roles
      .map((role) => t(`pages.settings.companies.roles.${role}`))
      .join(", ");
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
      companies.value = [...companies.value, created];
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
  .create_btn {
    margin-top: 12px;
  }
</style>
