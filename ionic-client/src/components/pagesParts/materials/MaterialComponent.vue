<template>
  <MaterialComponentHeader />
  <ion-item-group
    v-for="component in components"
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
  import MaterialComponentHeader from "./MaterialComponentHeader.vue";
  import MaterialListItems from "./MateriaListItems.vue";
  import { CalcResponseDTO, Material } from "@/types/dto";
  import MaterialModal from "./MaterialModal.vue";

  const props = defineProps<{
    components: CalcResponseDTO[];
  }>();

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
  };

  function handleMaterialUpdate(
    material: Material,
    component: CalcResponseDTO,
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
