import { describe, expect, it } from 'vitest';

import { parseArticle, renderArticleHtml } from './article';

describe('parseArticle', () => {
  it('делит на разделы по «## » и на абзацы по пустой строке', () => {
    const text = [
      '## Что это',
      'Первая строка',
      'вторая строка.',
      '',
      'Второй абзац.',
      '## Расход',
      'Текст.',
    ].join('\n');
    expect(parseArticle(text)).toEqual([
      { title: 'Что это', paragraphs: ['Первая строка вторая строка.', 'Второй абзац.'] },
      { title: 'Расход', paragraphs: ['Текст.'] },
    ]);
  });

  it('текст до первого заголовка — раздел без заголовка; CRLF и лишние пробелы не мешают', () => {
    expect(parseArticle('  Вступление  \r\n\r\n\r\n##   Раздел\r\nАбзац')).toEqual([
      { title: null, paragraphs: ['Вступление'] },
      { title: 'Раздел', paragraphs: ['Абзац'] },
    ]);
  });

  it('пустой текст — пусто', () => {
    expect(parseArticle(null)).toEqual([]);
    expect(parseArticle('  \n ')).toEqual([]);
    expect(renderArticleHtml(undefined)).toBe('');
  });
});

describe('renderArticleHtml', () => {
  it('экранирует текст: из админки в страницу не попадёт разметка', () => {
    expect(renderArticleHtml('## A & B\n<script>x</script>')).toBe(
      '<section><h2>A &amp; B</h2><p>&lt;script&gt;x&lt;/script&gt;</p></section>',
    );
  });
});
