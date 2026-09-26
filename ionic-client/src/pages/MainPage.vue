<template>
  <!--
    Главная для тех, кто пришёл впервые: что это и что тут можно сделать. Сценарии —
    настоящие скриншоты приложения (constants/landing.ts), а не описание словами.
    Адрес /ru/main оставлен прежним — он был в sitemap и в закладках.
  -->
  <ion-page>
    <ion-content>
      <div class="landing">
        <header class="hero">
          <h1 class="hero__title">{{ $t("pages.landing.title") }}</h1>
          <p class="hero__lead">{{ $t("pages.landing.lead") }}</p>
          <CutCornerBtn
            fullWidth
            @click="toCalculator"
          >
            {{ $t("pages.landing.cta") }}
          </CutCornerBtn>
        </header>

        <!-- Оглавление нужно, когда есть что оглавлять: с одной карточкой оно — повтор. -->
        <nav
          v-if="LANDING_SCENARIOS.length > 1"
          class="toc"
        >
          <p class="toc__caption">{{ $t("pages.landing.scenarios_title") }}</p>
          <button
            v-for="scenario in LANDING_SCENARIOS"
            :key="scenario.id"
            type="button"
            class="toc__row"
            @click="scrollTo(scenario.id)"
          >
            <ion-icon
              :icon="scenario.icon"
              aria-hidden="true"
            />
            <span class="toc__text">
              <span>{{
                $t(`pages.landing.scenarios.${scenario.id}.title`)
              }}</span>
              <small>{{
                $t(`pages.landing.scenarios.${scenario.id}.subtitle`)
              }}</small>
            </span>
            <ion-icon
              :icon="chevronForward"
              aria-hidden="true"
            />
          </button>
        </nav>

        <LandingScenarioCard
          v-for="scenario in LANDING_SCENARIOS"
          :key="scenario.id"
          :scenario="scenario"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { useRoute, useRouter } from "vue-router";
  import { chevronForward } from "ionicons/icons";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import LandingScenarioCard from "@/components/pagesParts/landing/LandingScenarioCard.vue";
  import { LANDING_SCENARIOS } from "@/constants/landing";

  const route = useRoute();
  const router = useRouter();

  function toCalculator() {
    router.push(`/${route.params.locale}/zayavka/calculator`);
  }

  function scrollTo(id: string) {
    document
      .getElementById(`scenario-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
</script>

<style scoped>
  .landing {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 16px 32px;
  }

  .hero__title {
    margin: 0 0 12px;
    font-size: 1.75rem;
    line-height: 1.2;
  }

  .hero__lead {
    margin: 0 0 20px;
    line-height: 1.5;
    opacity: 0.8;
  }

  .toc__caption {
    margin: 0 0 4px;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  .toc__row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 0;
    border: none;
    border-top: 1px solid var(--ion-color-medium);
    background: none;
    color: var(--ion-text-color);
    font: inherit;
    text-align: left;
  }

  .toc__row ion-icon:first-child {
    flex: none;
    font-size: 22px;
    color: var(--ion-color-secondary);
  }

  .toc__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .toc__text small {
    opacity: 0.7;
  }

  .outro {
    text-align: center;
  }

  @media (min-width: 768px) {
    .hero {
      max-width: 560px;
    }

    .hero__title {
      font-size: 2.4rem;
    }

    .outro {
      align-self: center;
      width: 360px;
    }
  }
</style>
