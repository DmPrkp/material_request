<template>
  <div>
    <ion-row>
      <ion-button @click="shareOnWhatsApp">
        <ion-icon
          :icon="logoWhatsapp"
          slot="start"
        ></ion-icon>
      </ion-button>
      <ion-button @click="shareOnTelegram">
        <ion-icon
          :icon="paperPlaneOutline"
          slot="start"
        ></ion-icon>
        Share on Telegram
      </ion-button>
      <ion-button @click="downloadPage">Download Current Page</ion-button>
    </ion-row>
  </div>
</template>

<script setup lang="ts">
  import { logoWhatsapp, paperPlaneOutline } from "ionicons/icons";
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
