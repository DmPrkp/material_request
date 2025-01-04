<template>
  <div>
    <ion-row class="ion-justify-content-end">
      <!-- WhatsApp Custom Button -->
      <ion-col size="auto">
        <ion-button
          @click="shareOnWhatsApp"
          class="whatsapp-btn custom-btn"
          expand="block"
        >
          <ion-icon
            :icon="logoWhatsapp"
            slot="icon-only"
          ></ion-icon>
        </ion-button>
      </ion-col>

      <!-- Telegram Custom Button -->
      <ion-col size="auto">
        <ion-button
          @click="shareOnTelegram"
          class="telegram-btn custom-btn"
          expand="block"
        >
          <ion-icon
            :icon="paperPlaneOutline"
            slot="icon-only"
          ></ion-icon>
        </ion-button>
      </ion-col>

      <!-- download -->
      <ion-col size="auto">
        <ion-button @click="downloadPage"
          ><ion-icon
            :icon="downloadOutline"
            slot="icon-only"
          ></ion-icon
        ></ion-button>
      </ion-col>

      <!-- save -->
      <!-- <ion-col size="auto">
        <ion-button @click="save"
          ><ion-icon
            :icon="saveOutline"
            slot="icon-only"
          ></ion-icon
        ></ion-button>
      </ion-col> -->
    </ion-row>
  </div>
</template>

<script setup lang="ts">
  import Zayavka from "@/models/zayavka";
  import { useZayavkaStore } from "@/store/zayavka";
  import { MaterialRequestDTO, ResultMaterialsDTO } from "@/types/dto";
  import {
    logoWhatsapp,
    paperPlaneOutline,
    downloadOutline,
    // saveOutline,
  } from "ionicons/icons";
  import { useRoute, useRouter } from "vue-router";

  const props = defineProps<{
    materials: ResultMaterialsDTO;
  }>();
  const route = useRoute();
  const router = useRouter();
  const store = useZayavkaStore();
  let orderId: number;

  async function save() {
    let res: MaterialRequestDTO;
    const data = {
      ...props.materials,
      system: route.params.system.toString(),
    };
    const zayavka = new Zayavka(data);
    if (orderId) {
      res = await zayavka.update(orderId, data);
    } else {
      res = await zayavka.create();
      orderId = res.id;
    }

    if (!res?.id) {
      return;
    }

    store.setMaterialRequest(res);
  }

  function createFullPath(orderId: number): string {
    const origin = window.location.origin;
    const route = router.resolve({
      name: "zayavka",
      params: { zayavka: orderId },
    });
    return origin + route.fullPath;
  }

  async function downloadPage() {
    const data = {
      ...props.materials,
      system: route.params.system.toString(),
    };
    const zayavka = new Zayavka(data);
    await zayavka.generateXLSX();
  }

  async function shareOnWhatsApp() {
    await save();

    if (!orderId) return;

    const pageUrl = createFullPath(orderId);
    const message = `Materials to work: ${pageUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
  }

  async function shareOnTelegram() {
    await save();

    if (!orderId) return;

    const pageUrl = createFullPath(orderId);
    const message = "Materials to work:"; // Your custom message
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      pageUrl
    )}&text=${encodeURIComponent(message)}`;

    window.open(telegramUrl, "_blank");
  }
</script>

<style scoped>
  .custom-btn {
    --color: white;
    --background: transparent;
  }

  /* WhatsApp Button */
  .whatsapp-btn {
    --background: #25d366;
    --border: none;
  }

  /* Telegram Button */
  .telegram-btn {
    --background: #0088cc;
    --border: none;
  }

  /* Styling for the icon */
  ion-icon {
    font-size: 28px;
  }
</style>
