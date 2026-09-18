import { Material } from "@/types/dto";

/**
 * Строка материала в этапе — это сборка, а не позиция: у двух «Буров по бетону»
 * (Ø 6 и Ø 10) один id и разные uniqKey. По id подсветка нуля загоралась у обоих,
 * а правка одного перезаписывала другой. У добавленных вручную uniqKey нет — там
 * id уникален сам (Date.now() из MaterialModal).
 */
export function materialKey(material: Pick<Material, "id" | "uniqKey">): string {
  return material.uniqKey ?? String(material.id);
}
