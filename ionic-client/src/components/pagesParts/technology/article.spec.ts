import { describe, expect, it } from "vitest";

import { parseArticle } from "./article";

// Зеркало dictionary-server/src/modules/structure/article.spec.ts: разбор обязан
// совпадать, иначе текст в приложении разойдётся с HTML для поисковиков.
describe("parseArticle", () => {
  it("делит на разделы по «## » и на абзацы по пустой строке", () => {
    const text = [
      "## Что это",
      "Первая строка",
      "вторая строка.",
      "",
      "Второй абзац.",
      "## Расход",
      "Текст.",
    ].join("\n");
    expect(parseArticle(text)).toEqual([
      {
        title: "Что это",
        paragraphs: ["Первая строка вторая строка.", "Второй абзац."],
      },
      { title: "Расход", paragraphs: ["Текст."] },
    ]);
  });

  it("текст до первого заголовка — раздел без заголовка; CRLF не мешает", () => {
    expect(
      parseArticle("  Вступление  \r\n\r\n\r\n##   Раздел\r\nАбзац"),
    ).toEqual([
      { title: null, paragraphs: ["Вступление"] },
      { title: "Раздел", paragraphs: ["Абзац"] },
    ]);
  });

  it("пустой текст — пусто", () => {
    expect(parseArticle(null)).toEqual([]);
    expect(parseArticle("  \n ")).toEqual([]);
  });
});
