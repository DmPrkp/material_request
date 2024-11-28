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
    </ion-row>
  </div>
</template>

<script setup lang="ts">
  import {
    logoWhatsapp,
    paperPlaneOutline,
    downloadOutline,
  } from "ionicons/icons";
  function downloadPage() {
    console.log();
  }

  function shareOnWhatsApp() {
    const pageUrl = window.location.href; // Current page URL
    const message = `Materials to work: ${pageUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Open the WhatsApp sharing link
    window.open(whatsappUrl, "_blank");
  }

  function shareOnTelegram() {
    const pageUrl = window.location.href; // Current page URL
    const message = "Materials to work:"; // Your custom message
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      pageUrl
    )}&text=${encodeURIComponent(message)}`;

    // Open the Telegram sharing link
    window.open(telegramUrl, "_blank");
  }
</script>

<style scoped>
  /* Customizing the shared buttons */
  .custom-btn {
    --color: white; /* Icon and text color */
    --background: transparent; /* Remove default background */
  }

  /* WhatsApp Button */
  .whatsapp-btn {
    --background: #25d366; /* WhatsApp color */
    --border: none;
  }

  /* Telegram Button */
  .telegram-btn {
    --background: #0088cc; /* Telegram color */
    --border: none;
  }

  /* Styling for the icon */
  ion-icon {
    font-size: 28px; /* Adjust icon size */
  }
</style>
