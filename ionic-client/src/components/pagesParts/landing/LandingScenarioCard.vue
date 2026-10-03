<template>
  <section
    ref="root"
    class="scenario"
    :aria-labelledby="`scenario-${scenario.id}`"
  >
    <div class="scenario__text">
      <h3 :id="`scenario-${scenario.id}`" class="scenario__title">
        {{ t(`${base}.title`) }}
      </h3>
      <p class="scenario__subtitle">{{ t(`${base}.subtitle`) }}</p>
      <ol class="scenario__steps">
        <li v-for="i in scenario.steps" :key="i">
          <button
            type="button"
            class="scenario__step"
            :class="{ 'scenario__step--active': i - 1 === step }"
            :aria-current="i - 1 === step ? 'step' : undefined"
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
          Только текущая тема и только шаги, до которых дошли (loaded): раньше в разметке
          были обе темы всех шагов всех сценариев, лишние прятал CSS — но display:none
          картинку браузер всё равно качает, а loading="lazy" в горизонтальной ленте
          ion-segment-view не срабатывал. Выходило ~30 файлов и полмегабайта на входе.
        -->
        <template v-for="i in scenario.steps" :key="i">
          <img
            v-if="loaded.has(i - 1)"
            class="phone__shot"
            :class="{ 'phone__shot--active': i - 1 === step }"
            :src="`/landing/${scenario.id}/${i}-${locale}-${activeTheme}.webp`"
            :alt="t(`${base}.steps[${i - 1}]`)"
            :aria-hidden="i - 1 !== step"
            :fetchpriority="first && i === 1 ? 'high' : undefined"
            width="480"
            height="1039"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import { LANDING_STEP_MS, LandingScenario } from "@/constants/landing";
  import { activeTheme } from "@/plugins/theme";

  /**
   * active — карточка открыта во вкладках главной. Шаги крутятся только у открытой
   * и видимой: соседние лежат в ion-segment-view за краем экрана.
   * first — первая вкладка: её первый скриншот — самое крупное на экране при входе.
   */
  const props = withDefaults(
    defineProps<{
      scenario: LandingScenario;
      active?: boolean;
      first?: boolean;
    }>(),
    { active: true, first: false },
  );

  const { t } = useI18n();
  const route = useRoute();
  const locale = computed(() => String(route.params.locale));
  const base = computed(() => `pages.landing.scenarios.${props.scenario.id}`);

  const root = ref<HTMLElement>();
  const step = ref(0);

  /**
   * Шаги, чьи скриншоты уже в разметке. Открытая карточка грузит текущий и следующий
   * шаг — к смене кадра он уже скачан; соседние вкладки ждут, пока их откроют.
   */
  const loaded = ref(new Set<number>());
  watch(
    [() => props.active, step],
    ([isActive, current]) => {
      if (!isActive) return;
      loaded.value = new Set([
        ...loaded.value,
        current,
        (current + 1) % props.scenario.steps,
      ]);
    },
    { immediate: true },
  );
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
    if (reducedMotion || !visible || !props.active) return;
    timer = setInterval(() => {
      step.value = (step.value + 1) % props.scenario.steps;
    }, LANDING_STEP_MS);
  }

  /** Нажатый шаг держится полный интервал, а не до ближайшего тика. */
  function select(index: number) {
    step.value = index;
    start();
  }

  // Перелистнули на эту карточку — показываем с первого шага, а не с того, на
  // котором её оставили.
  watch(
    () => props.active,
    (isActive) => {
      if (isActive) step.value = 0;
      start();
    },
  );

  onMounted(() => {
    // Крутим, только пока карточка на экране: за кадром смена шага — лишняя работа
    // и сюрприз — человек доскроллил, а там уже третий шаг.
    observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.4 },
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
    font-size: 1.1rem;
  }

  .scenario__subtitle {
    margin: 4px 0 0;
    font-size: 0.85rem;
    opacity: 0.7;
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
