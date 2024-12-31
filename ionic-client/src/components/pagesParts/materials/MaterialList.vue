<template>
  <MaterialHeader />
  <ion-item-group
    v-for="component in clearedComponents"
    :key="component.id"
  >
    <ion-item-divider v-if="component.materials.length">
      <ion-label>
        {{ $t(`pages.components.items.${component.title}`) }}
      </ion-label>
    </ion-item-divider>
    <MaterialListItems
      @modal="(e) => setOpen(component.id, e)"
      :materials="component.materials"
    />
    <ion-grid v-if="component.materials.length">
      <ion-row class="ion-justify-content-end">
        <ion-col size="auto">
          <ion-button
            size="small"
            @click="
              () =>
                setOpen(component.id, { volume: component.materials[0].volume })
            "
          >
            {{ $t("ui.buttons.add") }}
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-item-group>
</template>

<script lang="ts" setup>
  import { modalController } from "@ionic/vue";
  import MaterialHeader from "./MaterialHeader.vue";
  import MaterialListItems from "./MateriaListItems.vue";
  import { Material, MaterialListDTO } from "@/types/dto";
  import MaterialModal from "./MaterialModal.vue";
  import { ref, watch } from "vue";

  const props = defineProps<{
    components: MaterialListDTO[];
  }>();

  const emit = defineEmits(["update"]);

  const clearedComponents = ref<
    { id: number; materials: Material[]; title: string }[]
  >([]);

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
          title: m.title,
          materials: m.materials,
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
      id: number;
      material: Material;
    }>();

    if (!data?.material || !role) return;

    props.components.forEach((component) => {
      if (component.id !== data.id) return;

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
    const itemIndex = component.materials.findIndex(
      (mat) => mat.ru_title === material.ru_title
    );
    if (itemIndex === -1) {
      component.materials.push(material as Material);
    } else if (role === "confirm" && material) {
      component.materials[itemIndex] = { ...material };
    } else if (role === "remove") {
      component.materials.splice(itemIndex, 1);
    }
  }
</script>
