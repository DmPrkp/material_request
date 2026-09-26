/**
 * Сценарии главной: id — папка в public/landing, шаги — по скриншоту на каждый.
 * Порядок шагов и их число должны совпадать с LANDING_SCENARIOS в клиенте
 * (ionic-client/src/constants/landing.ts): карточка берёт n-й файл по номеру шага.
 *
 * Шаг получает { page, go, t, locale }: go — переход с префиксом локали, t — строка
 * из словарей клиента (кнопки ищем по тексту, у них нет устойчивых классов).
 */

// Технология из сидов словаря — у неё есть нормы.
const WORK_TYPE = 'interior';
const SYSTEM = 'GKL_C112';

/**
 * Значение в ion-input — событием, а не fill(): фокус на «телефоне» включает
 * scroll assist Ionic, страница уезжает к полю, и заголовок не попадает в кадр.
 */
async function setIonInput(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    el.value = v;
    el.dispatchEvent(new CustomEvent('ionInput', { detail: { value: v } }));
  }, value);
}

export const SCENARIOS = [
  {
    id: 'zayavka',
    steps: [
      // Плитка видов работ, а не группа: в группе пока одна технология, и экран пустой.
      async ({ go }) => {
        await go('/zayavka/calculator');
      },
      async ({ page, go }) => {
        await go(`/zayavka/calculator/${WORK_TYPE}/${SYSTEM}`);
        // Круглые 100 м² по умолчанию выглядят заглушкой — ставим правдоподобный объём.
        await setIonInput(page, 'ion-input.full-volume-block_input', '36');
        await setIonInput(page, '.crew-item ion-input', '2');
      },
      async ({ page, t }) => {
        await page.getByText(t('pages.components.send'), { exact: true }).click();
        await page.waitForURL(/\/materialList/);
      },
    ],
  },
];
