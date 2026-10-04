/**
 * Разбор текста страницы технологии (systems.article_* в словаре). Разметка своя и
 * минимальная — её правят руками в админке:
 *
 *   ## Заголовок раздела
 *   Абзац. Соседние строки склеиваются в один абзац.
 *
 *   Пустая строка — следующий абзац.
 *
 * Тот же разбор — в dictionary-server (modules/structure/article.ts): он отдаёт текст
 * HTML-фрагментом, который nginx клиента вставляет в страницу для поисковиков.
 * Меняется разметка — в обоих местах, иначе робот и человек увидят разное.
 */
export type ArticleSection = { title: string | null; paragraphs: string[] };

export function parseArticle(
  text: string | null | undefined,
): ArticleSection[] {
  const sections: ArticleSection[] = [];
  let section: ArticleSection | null = null;
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    if (!section) sections.push((section = { title: null, paragraphs: [] }));
    section.paragraphs.push(paragraph.join(" "));
    paragraph = [];
  };

  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      sections.push((section = { title: heading[1], paragraphs: [] }));
    } else if (!line) {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return sections;
}
