import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import type { Locale } from "./src/types";
import {
  CALCULATOR_KEY,
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
 * Заодно — sitemap: /sitemap.xml — индекс из двух файлов. sitemap-pages.xml — из тех же
 * ключей (раньше список путей вёлся руками), кроме видов работ и технологий калькулятора:
 * их знает только словарь, и sitemap-technologies.xml отдаёт dictionary-server — там и
 * технологии, заведённые без деплоя клиента.
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
        path.join(outDir, "sitemap-pages.xml"),
        renderSitemap(keys.filter(isStaticPage), locales),
      );
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), renderSitemapIndex());
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
  const body =
    key === HOME_KEY
      ? renderLanding(locale)
      : `<h1>${esc(seo.title[locale])}</h1><p>${esc(description)}</p>` +
        renderTechnologyText(locale, key);
  const shell =
    `<div id="app"><main class="seo-shell">` +
    `${body}<nav><ul>${links}</ul></nav></main></div>`;

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

/** Виды работ и технологии (calculator/<…>) — в sitemap словаря, не здесь. */
function isStaticPage(key: string) {
  return !key.startsWith(`${CALCULATOR_KEY}/`);
}

type LandingTerm = { term: string; text: string; formula?: string };
type LandingTexts = {
  title: string;
  lead: string;
  cta: string;
  scenarios_title: string;
  scenarios: Record<
    string,
    { title: string; subtitle: string; steps: string[] }
  >;
  method: { title: string; intro: string; items: Record<string, LandingTerm> };
  properties: { title: string; items: Record<string, LandingTerm> };
};

/**
 * Главная — целиком, а не только h1 и описание: весь её текст статичен (словари
 * интерфейса, не API), и Яндекс, который SPA рендерит плохо, видит всю страницу.
 * Порядок — ключей в словаре: он совпадает с constants/landing.ts, а сам модуль
 * отсюда не импортировать — он тянет ionicons.
 */
function renderLanding(locale: Locale) {
  const l = readDictionary(locale).pages.landing as LandingTexts;
  const terms = (items: Record<string, LandingTerm>) =>
    Object.values(items)
      .map(
        ({ term, text, formula }) =>
          `<dt>${esc(term)}</dt><dd>${formula ? `<code>${esc(formula)}</code> ` : ""}${esc(text)}</dd>`,
      )
      .join("");
  const scenarios = Object.values(l.scenarios)
    .map(
      ({ title, subtitle, steps }) =>
        `<h3>${esc(title)}</h3><p>${esc(subtitle)}</p>` +
        `<ol>${steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>`,
    )
    .join("");
  return (
    `<h1>${esc(l.title)}</h1><p>${esc(l.lead)}</p>` +
    `<p><a href="/${locale}/${CALCULATOR_KEY}">${esc(l.cta)}</a></p>` +
    `<section><h2>${esc(l.scenarios_title)}</h2>${scenarios}</section>` +
    `<section><h2>${esc(l.method.title)}</h2><p>${esc(l.method.intro)}</p>` +
    `<dl>${terms(l.method.items)}</dl></section>` +
    `<section><h2>${esc(l.properties.title)}</h2><dl>${terms(l.properties.items)}</dl></section>`
  );
}

/**
 * Место под текст технологии: сам текст живёт в словаре и правится в админке, поэтому
 * при сборке его нет — сборка в базу не ходит. На проде nginx клиента подставляет его
 * SSI-вставкой из dictionary-server (docker/nginx.conf, location /__article/), так что
 * робот видит текст без JS, а правка доходит до него без пересборки. Вне nginx (dev,
 * vite preview) это просто HTML-комментарий. Код — последний сегмент ключа
 * calculator/<вид работ>/<код>.
 */
function renderTechnologyText(locale: Locale, key: string) {
  const segments = key.split("/");
  if (segments[0] !== CALCULATOR_KEY || segments.length !== 3) return "";
  const code = encodeURIComponent(segments[2]);
  return `<!--# include virtual="/__article/${locale}/${code}" -->`;
}

function readDictionary(locale: Locale) {
  const file = path.resolve(
    __dirname,
    `src/plugins/i18n/locales/${locale}.json`,
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function renderSitemapIndex() {
  const lastmod = new Date().toISOString().split("T")[0];
  const sitemaps = ["sitemap-pages.xml", "sitemap-technologies.xml"]
    .map(
      (file) => `  <sitemap>
    <loc>${SITE_URL}/${file}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>
`;
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
