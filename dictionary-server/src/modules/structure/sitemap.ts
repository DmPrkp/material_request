import { DEFAULT_LOCALE, LOCALES } from '~/common/localize';

/**
 * Часть sitemap сайта, которую знает только словарь: страницы калькулятора видов работ и
 * технологий. Остальные страницы (сборники, «О проекте», сам калькулятор) — в статичном
 * sitemap клиента (ionic-client/seo-prerender.ts); /sitemap.xml — индекс обоих.
 * Отдельным файлом, а не при сборке клиента: при docker build словарь недоступен, а
 * технологии заводятся без деплоя.
 */

/** Адрес прода — как SITE_URL в ionic-client/src/router/constants.ts. */
export const SITE_URL = process.env.SITE_URL ?? 'https://zayavka.app';

export type SitemapTechnology = {
  /** work_types.code — сегмент адреса вида работ. */
  workType: string;
  /** systems.title — сегмент адреса технологии. */
  title: string;
  updatedAt: Date;
};

/** Адрес калькулятора на клиенте — как в ionic-client/src/router/index.ts. */
function pagePath(locale: string, segments: string[]) {
  return `/${locale}/zayavka/calculator/${segments.map(encodeURIComponent).join('/')}`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderUrls(siteUrl: string, segments: string[], lastmod: Date) {
  const href = (locale: string) => escapeXml(`${siteUrl}${pagePath(locale, segments)}`);
  // Каждая языковая версия ссылается на все, x-default — русская, как в head клиента.
  const alternates = [
    ...LOCALES.map(
      (locale) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${href(locale)}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${href(DEFAULT_LOCALE)}"/>`,
  ].join('\n');
  const day = lastmod.toISOString().split('T')[0];
  return LOCALES.map(
    (locale) => `  <url>
    <loc>${href(locale)}</loc>
${alternates}
    <lastmod>${day}</lastmod>
  </url>`,
  );
}

/**
 * Вид работ попадает, только если в нём есть хоть одна публичная технология: пустой
 * вид — страница «технологий пока нет», индексировать нечего. Его lastmod — самая
 * свежая правка его технологий.
 */
export function renderTechnologiesSitemap(siteUrl: string, technologies: SitemapTechnology[]): string {
  const workTypes = new Map<string, Date>();
  for (const { workType, updatedAt } of technologies) {
    const known = workTypes.get(workType);
    if (!known || known < updatedAt) workTypes.set(workType, updatedAt);
  }

  const urls = [
    ...[...workTypes].flatMap(([workType, lastmod]) => renderUrls(siteUrl, [workType], lastmod)),
    ...technologies.flatMap(({ workType, title, updatedAt }) =>
      renderUrls(siteUrl, [workType, title], updatedAt),
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}
