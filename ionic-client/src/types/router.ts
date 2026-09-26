export type Locale = "en" | "ru";

/** SEO страницы: заголовок и описание на каждой локали. */
export type SeoPages = Record<
  string,
  {
    title: Record<Locale, string>;
    description: Record<Locale, string>;
  }
>;
