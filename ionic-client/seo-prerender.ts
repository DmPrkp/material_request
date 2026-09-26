import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import type { Locale } from "./src/types";
import {
  HOME_KEY,
  OG_IMAGE,
  OG_LOCALES,
  SITE_NAME,
  SITE_URL,
  alternateLinks,
  pageTitle,
  seoPages,
} from "./src/router/constants";

/**
 * Статичный HTML публичных страниц — для тех, кто JS не исполняет: превью ссылок в
 * мессенджерах и роботы (Яндекс SPA рендерит плохо). Приложение одностраничное, и без
 * этого на любой адрес уходил один index.html: одинаковый title, пустой #app.
 *
 * После сборки из dist/index.html для каждого ключа seoPages и каждой локали пишется
 * dist/<locale>/<путь>.html: свои title, description, canonical, hreflang, og:*,
 * а в #app — h1, описание и ссылки на соседние разделы. Vue при монтировании #app
 * это содержимое заменяет, а head переписывает router/seo.ts (теги помечены data-seo).
 * Настоящих данных словаря здесь нет: при docker build API недоступен.
 *
 * <путь>.html, а не <путь>/index.html: /ru/zayavka — ещё и папка (под ней калькулятор),
 * и её index.html отдавался бы только по адресу со слэшем, которых у приложения нет.
 * nginx клиента (docker/nginx.conf) ищет try_files $uri $uri.html /index.html.
 *
 * Заодно — sitemap.xml из тех же ключей: раньше его список путей вёлся руками.
 */
export function seoPrerender(): Plugin {
  let outDir = "";
  return {
    name: "seo-prerender",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
      // Локали — как в plugins/i18n: по файлам словарей.
      const locales = fs
        .readdirSync(path.resolve(__dirname, "src/plugins/i18n/locales"))
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(/\.json$/, "") as Locale);
      const keys = Object.keys(seoPages);

      for (const locale of locales) {
        for (const key of keys) {
          const file = path.join(outDir, locale, `${key}.html`);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(
            file,
            renderPage(template, key, locale, locales, keys),
          );
        }
      }
      fs.writeFileSync(
        path.join(outDir, "sitemap.xml"),
        renderSitemap(keys, locales),
      );
    },
  };
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPage(
  template: string,
  key: string,
  locale: Locale,
  locales: Locale[],
  keys: string[],
) {
  const seo = seoPages[key];
  const pagePath = `/${locale}/${key}`;
  const url = `${SITE_URL}${pagePath}`;
  const title = pageTitle(seo, locale, key === HOME_KEY);
  const description = seo.description[locale];

  const tags = [
    `<meta data-seo name="description" content="${esc(description)}" />`,
    `<link data-seo rel="canonical" href="${url}" />`,
    ...alternateLinks(pagePath, locales).map(
      ({ hreflang, href }) =>
        `<link data-seo rel="alternate" hreflang="${hreflang}" href="${href}" />`,
    ),
    `<meta data-seo property="og:type" content="website" />`,
    `<meta data-seo property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta data-seo property="og:title" content="${esc(title)}" />`,
    `<meta data-seo property="og:description" content="${esc(description)}" />`,
    `<meta data-seo property="og:url" content="${url}" />`,
    `<meta data-seo property="og:image" content="${OG_IMAGE}" />`,
    `<meta data-seo property="og:locale" content="${OG_LOCALES[locale]}" />`,
    `<meta data-seo name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");

  // Ссылки на все публичные разделы той же локали: роботу — связи между
  // страницами, человеку до загрузки JS — навигация.
  const links = keys
    .filter((other) => other !== key)
    .map(
      (other) =>
        `<li><a href="/${locale}/${other}">${esc(seoPages[other].title[locale])}</a></li>`,
    )
    .join("");
  const shell =
    `<div id="app"><main class="seo-shell">` +
    `<h1>${esc(seo.title[locale])}</h1><p>${esc(description)}</p>` +
    `<nav><ul>${links}</ul></nav></main></div>`;

  const html = template
    // Общие теги index.html заменяются своими — иначе description и og:* двоились бы.
    .replace(/<meta\b[^>]*\bdata-seo\b[^>]*>\s*/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<html lang="[^"]*"/, `<html lang="${locale}"`)
    .replace("</head>", `  ${tags}\n  </head>`)
    .replace('<div id="app"></div>', shell);

  // Шаблон разошёлся с заменами (переформатировали index.html) — лучше упасть на
  // сборке, чем молча выкатить страницы без своих тегов.
  if (!html.includes(shell) || !html.includes(`<title>${esc(title)}</title>`)) {
    throw new Error(`seo-prerender: не удалось собрать ${pagePath}`);
  }
  return html;
}

function renderSitemap(keys: string[], locales: Locale[]) {
  const lastmod = new Date().toISOString().split("T")[0];
  const urls = keys.flatMap((key) =>
    locales.map((locale) => {
      const alternates = alternateLinks(`/${locale}/${key}`, locales)
        .map(
          ({ hreflang, href }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        )
        .join("\n");
      return `  <url>
    <loc>${SITE_URL}/${locale}/${key}</loc>
${alternates}
    <lastmod>${lastmod}</lastmod>
    <priority>${key === HOME_KEY ? "1.0" : "0.8"}</priority>
  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}
