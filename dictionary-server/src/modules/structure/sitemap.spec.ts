import { describe, expect, it } from 'vitest';

import { renderTechnologiesSitemap } from './sitemap';

const SITE = 'https://example.test';

describe('renderTechnologiesSitemap', () => {
  const xml = renderTechnologiesSitemap(SITE, [
    { workType: 'facade', title: 'EIFS', updatedAt: new Date('2026-09-01T10:00:00Z') },
    { workType: 'facade', title: 'frame_scaffold', updatedAt: new Date('2026-09-20T10:00:00Z') },
    { workType: 'interior', title: 'GKL_C112', updatedAt: new Date('2026-08-15T10:00:00Z') },
  ]);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('отдаёт вид работ и технологию на каждом языке', () => {
    expect(locs).toEqual([
      `${SITE}/ru/zayavka/calculator/facade`,
      `${SITE}/en/zayavka/calculator/facade`,
      `${SITE}/ru/zayavka/calculator/interior`,
      `${SITE}/en/zayavka/calculator/interior`,
      `${SITE}/ru/zayavka/calculator/facade/EIFS`,
      `${SITE}/en/zayavka/calculator/facade/EIFS`,
      `${SITE}/ru/zayavka/calculator/facade/frame_scaffold`,
      `${SITE}/en/zayavka/calculator/facade/frame_scaffold`,
      `${SITE}/ru/zayavka/calculator/interior/GKL_C112`,
      `${SITE}/en/zayavka/calculator/interior/GKL_C112`,
    ]);
  });

  it('связывает языковые версии через hreflang, x-default — русская', () => {
    const block = xml
      .split('<url>')
      .find((part) => part.includes('/en/zayavka/calculator/facade/EIFS</loc>'))!;
    expect(block).toContain(`hreflang="ru" href="${SITE}/ru/zayavka/calculator/facade/EIFS"`);
    expect(block).toContain(`hreflang="en" href="${SITE}/en/zayavka/calculator/facade/EIFS"`);
    expect(block).toContain(`hreflang="x-default" href="${SITE}/ru/zayavka/calculator/facade/EIFS"`);
  });

  it('lastmod вида работ — самая свежая правка его технологий', () => {
    const facade = xml.split('<url>').find((part) => part.includes('/ru/zayavka/calculator/facade</loc>'))!;
    expect(facade).toContain('<lastmod>2026-09-20</lastmod>');
  });

  it('без технологий — пустой, но валидный urlset', () => {
    const empty = renderTechnologiesSitemap(SITE, []);
    expect(empty).toContain('<urlset');
    expect(empty).not.toContain('<url>');
  });
});
