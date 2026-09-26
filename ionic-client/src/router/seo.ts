import type { RouteLocationNormalized } from "vue-router";
import { head } from "@/plugins/head";
import { SUPPORTED_LOCALES } from "@/plugins/i18n";
import { Locale } from "@/types";
import {
  NOINDEX_ROUTES,
  OG_IMAGE,
  OG_LOCALES,
  SITE_NAME,
  SITE_URL,
  alternateLinks,
  findSeo,
  notFoundSeo,
  pageTitle,
} from "./constants";

// Одна запись head на всё приложение, дальше только patch: useHead вне setup на
// каждом переходе добавлял бы новую запись, и они копились бы до перезагрузки.
let entry: ReturnType<typeof head.push> | undefined;

export function applySeo(to: RouteLocationNormalized, locale: Locale) {
  if (!entry) {
    // Статичные теги из HTML (index.html и страницы seo-prerender.ts) — для тех, кто
    // JS не исполняет: превью в мессенджерах, часть роботов. Дальше ими управляет
    // head, иначе description, canonical и og:* двоились бы.
    document.head.querySelectorAll("[data-seo]").forEach((el) => el.remove());
    entry = head.push({});
  }

  const seo = to.name === "not-found" ? notFoundSeo : findSeo(to.path);
  const title = pageTitle(seo, locale, to.name === "zayavka-list");
  const description = seo.description[locale];
  const indexable = !NOINDEX_ROUTES.has(String(to.name));
  // Без query и хвостового слэша: параметры расчёта и фильтры — не отдельные страницы.
  const url = `${SITE_URL}${to.path.replace(/\/$/, "")}`;

  entry.patch({
    title,
    htmlAttrs: { lang: locale },
    link: indexable
      ? [
          { rel: "canonical", href: url },
          ...alternateLinks(to.path, SUPPORTED_LOCALES).map((link) => ({
            rel: "alternate",
            ...link,
            key: `alternate-${link.hreflang}`,
          })),
        ]
      : [],
    meta: [
      { name: "description", content: description },
      {
        name: "robots",
        content: indexable ? "index, follow" : "noindex, follow",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:locale", content: OG_LOCALES[locale] },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  });
}
