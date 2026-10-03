<template>
  <!--
    Главная для тех, кто пришёл впервые: что делает приложение, как считает и как с
    ним работать. Тон — описание, а не реклама: метод расчёта, порядок работы по
    настоящим скриншотам (constants/landing.ts), устройство данных.
    Адрес /ru/main оставлен прежним — он был в sitemap и в закладках.
  -->
  <ion-page>
    <ion-content>
      <div class="landing">
        <header class="hero">
          <h1 class="hero__title">{{ $t("pages.landing.title") }}</h1>
          <p class="hero__lead">{{ $t("pages.landing.lead") }}</p>
          <CutCornerBtn fullWidth :to="calculatorPath">
            {{ $t("pages.landing.cta") }}
          </CutCornerBtn>
        </header>

        <section class="section">
          <h2 class="section__title">
            <span class="section__num">1</span>
            {{ $t("pages.landing.scenarios_title") }}
          </h2>
          <!--
            Вкладки + свайп (ion-segment-view, Ionic ≥ 8.4), а не лента карточек с
            прокруткой к нужной: сценарии листаются вбок, раздел занимает один экран.
            Свайп сам переключает вкладку, нажатие на вкладку — листает.
          -->
          <ion-segment v-model="activeScenario" class="tabs" scrollable>
            <ion-segment-button
              v-for="scenario in LANDING_SCENARIOS"
              :key="scenario.id"
              :value="scenario.id"
              :content-id="`landing-${scenario.id}`"
              layout="icon-top"
            >
              <ion-icon :icon="scenario.icon" aria-hidden="true" />
              <ion-label>{{
                $t(`pages.landing.scenarios.${scenario.id}.title`)
              }}</ion-label>
            </ion-segment-button>
          </ion-segment>
          <ion-segment-view ref="segmentView">
            <ion-segment-content
              v-for="scenario in LANDING_SCENARIOS"
              :id="`landing-${scenario.id}`"
              :key="scenario.id"
            >
              <LandingScenarioCard
                :scenario="scenario"
                :active="scenario.id === activeScenario"
                :first="scenario.id === LANDING_SCENARIOS[0].id"
              />
            </ion-segment-content>
          </ion-segment-view>
        </section>

        <section class="section">
          <h2 class="section__title">
            <span class="section__num">2</span>
            {{ $t("pages.landing.method.title") }}
          </h2>
          <p class="section__intro">{{ $t("pages.landing.method.intro") }}</p>
          <dl class="terms">
            <template v-for="item in LANDING_METHOD" :key="item.key">
              <dt>{{ $t(`pages.landing.method.items.${item.key}.term`) }}</dt>
              <dd>
                <code v-if="item.formula" class="formula">{{
                  $t(`pages.landing.method.items.${item.key}.formula`)
                }}</code>
                {{ $t(`pages.landing.method.items.${item.key}.text`) }}
              </dd>
            </template>
          </dl>
        </section>

        <section class="section">
          <h2 class="section__title">
            <span class="section__num">3</span>
            {{ $t("pages.landing.properties.title") }}
          </h2>
          <dl class="terms">
            <template v-for="key in LANDING_PROPERTIES" :key="key">
              <dt>{{ $t(`pages.landing.properties.items.${key}.term`) }}</dt>
              <dd>{{ $t(`pages.landing.properties.items.${key}.text`) }}</dd>
            </template>
          </dl>
        </section>

        <footer class="outro">
          <CutCornerBtn fullWidth :to="calculatorPath">
            {{ $t("pages.landing.cta") }}
          </CutCornerBtn>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { useRoute } from "vue-router";
  import CutCornerBtn from "@/components/ui/CutCornerBtn.vue";
  import LandingScenarioCard from "@/components/pagesParts/landing/LandingScenarioCard.vue";
  import {
    LANDING_METHOD,
    LANDING_PROPERTIES,
    LANDING_SCENARIOS,
  } from "@/constants/landing";

  const route = useRoute();

  const activeScenario = ref(LANDING_SCENARIOS[0].id);
  const segmentView = ref<{ $el: HTMLElement }>();

  /**
   * ion-segment-view — это горизонтальная прокрутка со snap. Сменилась ширина
   * (поворот телефона, окно) — scrollLeft остаётся старым, и лента замирает между
   * двумя карточками. Ionic сам не выравнивает — ставим на открытую вкладку.
   * ResizeObserver на самой ленте, а не resize окна: тот приходит раньше, чем
   * лента перестроилась, и выравнивание считалось по старой ширине.
   */
  let resizeObserver: ResizeObserver | undefined;

  function realign() {
    const el = segmentView.value?.$el;
    const index = LANDING_SCENARIOS.findIndex(
      (s) => s.id === activeScenario.value,
    );
    if (el && index >= 0) el.scrollLeft = index * el.clientWidth;
  }

  onMounted(() => {
    const el = segmentView.value?.$el;
    if (!el) return;
    resizeObserver = new ResizeObserver(() => requestAnimationFrame(realign));
    resizeObserver.observe(el);
  });
  onBeforeUnmount(() => resizeObserver?.disconnect());

  // Ссылка, а не router.push по клику: переход главная → калькулятор видит поисковик.
  const calculatorPath = computed(() => `/${route.params.locale}/calculator`);
</script>

<style scoped>
  .landing {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 16px 32px;
  }

  .hero__title {
    margin: 0 0 12px;
    font-size: 1.6rem;
    line-height: 1.25;
  }

  .hero__lead {
    margin: 0 0 20px;
    line-height: 1.55;
    opacity: 0.85;
  }

  .section__title {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--ion-color-medium);
    font-size: 1.25rem;
  }

  .section__num {
    color: var(--ion-color-secondary);
  }

  .section__intro {
    margin: 0 0 16px;
    line-height: 1.55;
  }

  /* Определения: термин — строкой над текстом, на телефоне колонки не влезают. */
  .terms {
    margin: 0;
  }

  .terms dt {
    margin-top: 16px;
    color: var(--ion-color-secondary);
  }

  .terms dt:first-child {
    margin-top: 0;
  }

  .terms dd {
    margin: 4px 0 0;
    line-height: 1.55;
    opacity: 0.85;
  }

  .formula {
    display: block;
    width: fit-content;
    margin: 4px 0 6px;
    padding: 4px 10px;
    border-left: 3px solid var(--ion-color-primary);
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 1rem;
    opacity: 1;
  }

  /* Вкладки впритык к краям экрана: так видно, что ряд прокручивается вбок. */
  .tabs {
    margin: 0 -16px 12px;
    width: calc(100% + 32px);
  }

  .tabs ion-segment-button {
    min-width: 96px;
    --padding-start: 8px;
    --padding-end: 8px;
    font-size: 0.75rem;
    text-transform: none;
    letter-spacing: 0;
  }

  .tabs ion-label {
    white-space: normal;
    line-height: 1.2;
  }

  @media (min-width: 768px) {
    .hero {
      max-width: 640px;
    }

    .hero__title {
      font-size: 2.2rem;
    }

    /* На широком экране термин слева, текст справа — как в справочнике. */
    .terms {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 16px 24px;
    }

    .terms dt {
      margin-top: 0;
    }

    .terms dd {
      margin: 0;
    }

    .outro {
      align-self: center;
      width: 360px;
    }
  }
</style>
