<template>
  <ion-footer>
    <ion-grid>
      <ion-row>
        <template v-for="(item, index) in menuItems" :key="item.name">
          <!-- Кнопка встаёт между половинами: перед первым пунктом второй половины. -->
          <ion-col
            v-if="index === centerAt"
            class="center"
            :class="{ hidden: onAssistantPage }"
          >
            <ion-button
              shape="round"
              :aria-label="$t('footer.assistant')"
              :title="$t('footer.assistant')"
              :router-link="getLocalizedRoute('ai_halper')"
              :tabindex="onAssistantPage ? -1 : undefined"
              :aria-hidden="onAssistantPage"
            >
              <ion-icon slot="icon-only" :icon="robotOutline" />
            </ion-button>
          </ion-col>
          <ion-col no-padding class="ion-align-self-end">
            <router-link :to="getLocalizedRoute(item.link)">
              <ion-icon color="dark" :icon="item.icon" />
            </router-link>
            <ion-text class="label">
              {{ $t(`footer.${item.name}`) }}
            </ion-text>
          </ion-col>
        </template>
      </ion-row>
    </ion-grid>
  </ion-footer>
</template>

<script setup lang="ts">
  import {
    IonButton,
    IonIcon,
    IonFooter,
    IonGrid,
    IonCol,
    IonText,
    IonRow,
  } from "@ionic/vue";
  import { computed } from "vue";
  import { useRoute } from "vue-router";
  import injectI18nToRoute from "@/mixins/injectI18nToRoute";
  import { useAuthStore } from "@/store/auth";
  import { AUTH_ENABLED } from "@/constants/auth";
  import { robotOutline } from "@/constants/icons";
  import {
    AUTH,
    CALCULATOR,
    CATALOG,
    WAREHOUSES,
    ZAYAVKA,
  } from "@/constants/nav";

  const authStore = useAuthStore();
  const currentRoute = useRoute();

  // Мы уже в чате — кнопка на него не нужна и уезжает в полосу, на других страницах возвращается.
  const onAssistantPage = computed(() => currentRoute.name === "ai_halper");

  // Настроек здесь нет: они в боковом меню справа в шапке, профиль — по аватару.
  // На /main тоже не ведём — туда по логотипу. Расчёт идёт перед «Заявками»:
  // сначала считают, потом сохраняют заявкой.
  const menuItems = computed(() => {
    // Пока авторизация выключена флагом, вкладку входа не показываем
    // и работаем так, будто пользователь уже вошёл.
    if (!AUTH_ENABLED || authStore.isAuthenticated) {
      return [CATALOG, CALCULATOR, ZAYAVKA, WAREHOUSES];
    }

    return [CATALOG, CALCULATOR, AUTH, ZAYAVKA];
  });

  // Индекс, перед которым встаёт центральная кнопка: пунктов четыре — она между
  // второй и третьей вкладкой, ровно посередине полосы.
  const centerAt = computed(() => Math.ceil(menuItems.value.length / 2));

  const getLocalizedRoute = (routeName: string) => {
    const route = useRoute();
    const routeLocale =
      typeof route.params.locale === "string" ? route.params.locale : null;
    const locale = routeLocale || import.meta.env.VITE_DEFAULT_LOCALE;
    return injectI18nToRoute(routeName, locale, route);
  };
</script>

<!--
  scoped обязательно: без него правило уходило на все ion-col приложения, и таблицы
  молча жили центрированными — двухстрочные названия вставали по центру.
-->
<style scoped>
  /*
   * 24px вместо ionic-ного size="large" (32px): нижняя полоса должна читаться,
   * а не перетягивать на себя экран — на телефоне она всегда перед глазами.
   */
  ion-icon {
    font-size: 24px;
  }

  /*
   * Центральная колонка занимает в потоке только щель между вкладками, а сама кнопка
   * крупнее неё и выведена из потока (absolute): иначе её размер отнимал бы ширину у
   * вкладок — «Warehouses» (≈80px) уходило второй строкой — и раздувал бы высоту
   * полосы. width: auto обязателен: у ion-col по умолчанию 100%.
   */
  ion-col.center {
    position: relative;
    flex: 0 0 48px;
    width: 48px;
    max-width: none;
    height: 0;
    padding: 0;
    align-self: center;
  }

  /*
   * Кнопка выступает над полосой: сдвиг transform, а не отрицательный margin —
   * высота футера не меняется, и контент страниц не пляшет. Выступать можно:
   * у цепочки футера overflow: visible, а z-index: 10 у ion-footer кладёт кнопку
   * поверх страницы. Кольцо цвета фона отделяет её от того, что под ней.
   */
  ion-col.center ion-button {
    --padding-start: 0;
    --padding-end: 0;
    --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
    position: absolute;
    top: 0;
    left: 50%;
    width: 60px;
    height: 60px;
    margin: 0;
    transform: translate(-50%, calc(-50% - 10px));
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--ion-background-color);
  }

  /*
   * Уезжает вниз в полосу и гаснет, а не пропадает через v-if: место в потоке остаётся,
   * и вкладки не сдвигаются. pointer-events: none — невидимая кнопка не ловит нажатия.
   */
  ion-col.center ion-button {
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
  }

  ion-col.center.hidden ion-button {
    transform: translate(-50%, 0);
    opacity: 0;
    pointer-events: none;
  }

  ion-col.center ion-icon {
    font-size: 36px;
  }

  /*
   * Пять колонок на 375px: «Warehouses» (≈80px при 12px) иначе не помещалось и
   * уезжало второй строкой под полосу. Отступы сетки и колонок гасим, перенос
   * запрещаем — при нехватке места лучше ужать колонку, чем ломать полосу.
   * Гасим только горизонтальные: вертикальные 5px дают полосе прежнюю высоту,
   * без них подписи прижимались к нижнему краю.
   */
  ion-grid {
    padding: 5px 0;
  }

  /*
   * min-height держит высоту полосы 68px (5 + 58 + 5): раньше её задавала кнопка в
   * потоке, а теперь та выведена из него и полоса сжималась до высоты вкладок.
   */
  ion-row {
    flex-wrap: nowrap;
    min-height: 58px;
  }

  .label {
    font-size: 0.75rem;
  }

  ion-col {
    padding: 5px 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
</style>
