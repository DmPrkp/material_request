/**
 * Текст страницы технологии (systems.article_ru/en). Разметка нарочно своя и
 * минимальная — её правят руками в админке, и ничего, кроме заголовков и абзацев,
 * странице не нужно:
 *
 *   ## Заголовок раздела
 *   Абзац. Соседние строки склеиваются в один абзац.
 *
 *   Пустая строка — следующий абзац.
 *
 * Тот же разбор — у клиента (ionic-client/.../technology/article.ts): там текст рисует
 * TechnologyText.vue, а здесь он уходит HTML-фрагментом в страницу для поисковиков.
 * Меняется разметка — в обоих местах.
 */
export type ArticleSection = { title: string | null; paragraphs: string[] };

export function parseArticle(text: string | null | undefined): ArticleSection[] {
  const sections: ArticleSection[] = [];
  let section: ArticleSection | null = null;
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    if (!section) sections.push((section = { title: null, paragraphs: [] }));
    section.paragraphs.push(paragraph.join(' '));
    paragraph = [];
  };

  for (const raw of (text ?? '').split(/\r?\n/)) {
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

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Фрагмент для SSI-вставки в HTML страницы технологии (ionic-client/docker/nginx.conf). */
export function renderArticleHtml(text: string | null | undefined): string {
  return parseArticle(text)
    .map(
      ({ title, paragraphs }) =>
        `<section>${title ? `<h2>${escapeHtml(title)}</h2>` : ''}` +
        paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('') +
        '</section>',
    )
    .join('');
}
