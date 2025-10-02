<template>
  <MaterialHeader />
  <ion-item-group
    v-for="component in clearedComponents"
    :key="component.id"
  >
    <ion-item-divider v-if="component.materials.length">
      <ion-label color="secondary">
        <h2>{{ component.title }}</h2>
      </ion-label>
    </ion-item-divider>
    <MaterialListItems
      @modal="(e) => setOpen(component.id, e)"
      :materials="component.materials"
    />
    <ion-grid v-if="component.materials.length">
      <ion-row
        class="ion-justify-content-end"
        v-if="status !== MATERIAL_LIST_STATUS.DISABLED"
      >
        <ion-col size="auto">
          <!-- <ion-button
            size="small"
            @click="
              () =>
                setOpen(component.id, { volume: component.materials[0].volume })
            "
          >
            {{ $t("ui.buttons.add") }}
          </ion-button> -->
          <CutCornerBtn
            @click="
              () =>
                setOpen(component.id, { volume: component.materials[0].volume })
            "
            >{{ $t("ui.buttons.add") }}</CutCornerBtn
          >
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item-group>
</template>

<script lang="ts" setup>
  import { ref, watch } from "vue";
  import { modalController } from "@ionic/vue";
  import { Material, MaterialListDTO } from "@/types/dto";
  import { MaterialListStatus } from "@/types/ui";
  import { MATERIAL_LIST_STATUS } from "@/constants";
  import MaterialListItems from "./MateriaListItems.vue";
  import MaterialModal from "./MaterialModal.vue";
  import MaterialHeader from "./MaterialHeader.vue";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import { useI18n } from "vue-i18n";

  type ClearedComponent = { id: number; materials: Material[]; title: string };

  const { t } = useI18n({ useScope: "global" });

  const props = defineProps<{
    components: MaterialListDTO[];
    status: MaterialListStatus;
  }>();

  const emit = defineEmits(["update"]);

  const clearedComponents = ref<ClearedComponent[]>([]);

  watch(
    () => clearedComponents.value,
    (newVal) => {
      emit("update", newVal);
    },
    { deep: true }
  );

  watch(
    () => props.components,
    (components) => {
      clearedComponents.value = components
        .filter((m) => m.materials?.length)
        .map((m) => ({
          id: m.id,
          title:
            props.status === MATERIAL_LIST_STATUS.DISABLED
              ? m.title
              : t(`pages.components.items.${m.title}`),
          materials: m.materials.map((m) => ({
            ...m,
            measure:
              props.status === MATERIAL_LIST_STATUS.DISABLED
                ? m.measure
                : t(`measure.${m.measure}`),
          })),
        }));
    },
    { immediate: true }
  );

  const setOpen = async (componentId: number, material: Partial<Material>) => {
    const modal = await modalController.create({
      component: MaterialModal,
      componentProps: { id: componentId, material },
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss<{
      componentId: number;
      material: Material;
    }>();

    if (!role || role === "cancel" || !data?.material) return;

    clearedComponents.value.forEach((component) => {
      if (component.id !== componentId) return;

      const { material } = data;

      handleMaterialUpdate(material, component, role);
    });
    emit("update", props.components);
  };

  function handleMaterialUpdate(
    material: Material,
    component: MaterialListDTO,
    role: string
  ) {
    const i = component.materials.findIndex((mat) => mat.id === material.id);

    switch (role) {
      case "add":
        component.materials.push(material);
        break;
      case "edit":
        component.materials[i] = { ...material };
        break;
      case "remove":
        component.materials.splice(i, 1);
        break;
      default:
        break;
    }
  }
</script>
