<template>
  <section
    ref="root"
    class="scenario"
    :aria-labelledby="`scenario-${scenario.id}`"
  >
    <div class="scenario__text">
      <h2
        :id="`scenario-${scenario.id}`"
        class="scenario__title"
      >
        <span class="slanted">{{ t(`${base}.title`) }}</span>
      </h2>
      <ol class="scenario__steps">
        <li
          v-for="i in scenario.steps"
          :key="i"
        >
          <button
            type="button"
            class="scenario__step"
            :class="{ 'scenario__step--active': i - 1 === active }"
            :aria-current="i - 1 === active ? 'step' : undefined"
            @click="select(i - 1)"
          >
            <span class="scenario__num">{{ i }}</span>
            <span>{{ t(`${base}.steps[${i - 1}]`) }}</span>
          </button>
        </li>
      </ol>
    </div>

    <div class="phone">
      <div class="phone__screen">
        <!--
          Обе темы в разметке, лишняя скрыта CSS по body.dark: тему переключают в
          настройках без перезагрузки, а display:none картинку браузер не качает.
        -->
        <template
          v-for="i in scenario.steps"
          :key="i"
        >
          <img
            v-for="theme in THEMES"
            :key="theme"
            class="phone__shot"
            :class="[
              `landing-shot--${theme}`,
              { 'phone__shot--active': i - 1 === active },
            ]"
            :src="`/landing/${scenario.id}/${i}-${locale}-${theme}.webp`"
            :alt="t(`${base}.steps[${i - 1}]`)"
            :aria-hidden="i - 1 !== active"
            :loading="i === 1 ? 'eager' : 'lazy'"
            width="480"
            height="1039"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import { LANDING_STEP_MS, LandingScenario } from "@/constants/landing";

  const props = defineProps<{ scenario: LandingScenario }>();

  const THEMES = ["light", "dark"] as const;

  const { t } = useI18n();
  const route = useRoute();
  const locale = computed(() => String(route.params.locale));
  const base = computed(() => `pages.landing.scenarios.${props.scenario.id}`);

  const root = ref<HTMLElement>();
  const active = ref(0);
  let timer: ReturnType<typeof setInterval> | undefined;
  let observer: IntersectionObserver | undefined;
  let visible = false;

  // Кто просил меньше движения — листает шаги сам, карточка не крутится.
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  function stop() {
    clearInterval(timer);
    timer = undefined;
  }

  function start() {
    stop();
    if (reducedMotion || !visible) return;
    timer = setInterval(() => {
      active.value = (active.value + 1) % props.scenario.steps;
    }, LANDING_STEP_MS);
  }

  /** Нажатый шаг держится полный интервал, а не до ближайшего тика. */
  function select(index: number) {
    active.value = index;
    start();
  }

  onMounted(() => {
    // Крутим, только пока карточка на экране: за кадром смена шага — лишняя работа
    // и сюрприз — человек доскроллил, а там уже третий шаг.
    observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.4 }
    );
    if (root.value) observer.observe(root.value);
  });

  onBeforeUnmount(() => {
    stop();
    observer?.disconnect();
  });
</script>

<style scoped>
  .scenario {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 16px;
    border: 1px solid var(--ion-color-medium);
    border-radius: 16px;
  }

  .scenario__title {
    margin: 0;
    font-size: 1.3rem;
    color: var(--ion-color-secondary);
  }

  .scenario__steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .scenario__step {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 0;
    border: none;
    background: none;
    color: var(--ion-text-color);
    font: inherit;
    text-align: left;
    opacity: 0.55;
    transition: opacity 0.3s;
  }

  .scenario__step--active {
    opacity: 1;
  }

  .scenario__num {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--ion-color-primary);
    color: var(--ion-color-primary);
  }

  .scenario__step--active .scenario__num {
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
  }

  .phone {
    align-self: center;
    /* Ширина от экрана, но не больше: на 375px телефон не должен съесть карточку. */
    width: min(62vw, 240px);
    padding: 8px;
    border-radius: 32px;
    background: var(--ion-text-color);
  }

  .phone__screen {
    position: relative;
    aspect-ratio: 390 / 844;
    overflow: hidden;
    border-radius: 24px;
    background: var(--ion-background-color);
  }

  .phone__shot {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.5s;
  }

  .phone__shot--active {
    opacity: 1;
  }

  @media (min-width: 768px) {
    .scenario {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 32px;
    }

    .scenario__text {
      flex: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .phone__shot,
    .scenario__step {
      transition: none;
    }
  }
</style>

<style>
  /* Не scoped: переключатель — класс на body, вне компонента. */
  body.dark .landing-shot--light,
  body:not(.dark) .landing-shot--dark {
    display: none;
  }
</style>
