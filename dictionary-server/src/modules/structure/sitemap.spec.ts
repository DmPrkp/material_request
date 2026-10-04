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
      `${SITE}/ru/calculator/facade`,
      `${SITE}/en/calculator/facade`,
      `${SITE}/ru/calculator/interior`,
      `${SITE}/en/calculator/interior`,
      `${SITE}/ru/calculator/facade/EIFS`,
      `${SITE}/en/calculator/facade/EIFS`,
      `${SITE}/ru/calculator/facade/frame_scaffold`,
      `${SITE}/en/calculator/facade/frame_scaffold`,
      `${SITE}/ru/calculator/interior/GKL_C112`,
      `${SITE}/en/calculator/interior/GKL_C112`,
    ]);
  });

  it('связывает языковые версии через hreflang, x-default — русская', () => {
    const block = xml
      .split('<url>')
      .find((part) => part.includes('/en/calculator/facade/EIFS</loc>'))!;
    expect(block).toContain(`hreflang="ru" href="${SITE}/ru/calculator/facade/EIFS"`);
    expect(block).toContain(`hreflang="en" href="${SITE}/en/calculator/facade/EIFS"`);
    expect(block).toContain(`hreflang="x-default" href="${SITE}/ru/calculator/facade/EIFS"`);
  });

  it('lastmod вида работ — самая свежая правка его технологий', () => {
    const facade = xml.split('<url>').find((part) => part.includes('/ru/calculator/facade</loc>'))!;
    expect(facade).toContain('<lastmod>2026-09-20</lastmod>');
  });

  it('без технологий — пустой, но валидный urlset', () => {
    const empty = renderTechnologiesSitemap(SITE, []);
    expect(empty).toContain('<urlset');
    expect(empty).not.toContain('<url>');
  });
});
