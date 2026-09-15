/**
 * Типоразмеры позиции. Колонки `code` здесь нет намеренно: он вычисляется
 * через buildVariantCode() при заливке. Вида параметра тоже нет — он на самом
 * значении, в param-values.ts.
 */
type MaterialVariant = { id: number; materialId: number; paramValueIds: number[] };

export const materialVariants: MaterialVariant[] = [
  { id: 10, materialId: 1, paramValueIds: [] },
  { id: 20, materialId: 2, paramValueIds: [] },
  { id: 30, materialId: 3, paramValueIds: [] },
  { id: 40, materialId: 4, paramValueIds: [] },
  { id: 50, materialId: 5, paramValueIds: [] },
  { id: 60, materialId: 6, paramValueIds: [] },
  { id: 70, materialId: 7, paramValueIds: [] },
  { id: 80, materialId: 8, paramValueIds: [207, 226] }, // Дюбель-гвоздь для изоляции 8
  { id: 81, materialId: 8, paramValueIds: [207, 235] },
  { id: 82, materialId: 8, paramValueIds: [207, 239] },
  { id: 83, materialId: 8, paramValueIds: [207, 243] },
  { id: 84, materialId: 8, paramValueIds: [207, 252] },
  { id: 85, materialId: 8, paramValueIds: [207, 250] },
  { id: 86, materialId: 8, paramValueIds: [208, 226] }, // Дюбель-гвоздь для изоляции 10
  { id: 87, materialId: 8, paramValueIds: [208, 235] },
  { id: 88, materialId: 8, paramValueIds: [208, 239] },
  { id: 89, materialId: 8, paramValueIds: [208, 243] },
  { id: 90, materialId: 8, paramValueIds: [208, 252] },
  { id: 91, materialId: 8, paramValueIds: [208, 250] },
  { id: 95, materialId: 9, paramValueIds: [] },
  { id: 100, materialId: 10, paramValueIds: [] },
  { id: 110, materialId: 11, paramValueIds: [] },
  { id: 120, materialId: 12, paramValueIds: [205, 225] }, // Дюбель-гвозди 6
  { id: 121, materialId: 12, paramValueIds: [205, 227] },
  { id: 122, materialId: 12, paramValueIds: [205, 228] },
  { id: 123, materialId: 12, paramValueIds: [205, 229] },
  { id: 124, materialId: 12, paramValueIds: [207, 227] }, // Дюбель-гвозди 8
  { id: 125, materialId: 12, paramValueIds: [207, 229] },
  { id: 126, materialId: 12, paramValueIds: [207, 231] },
  { id: 127, materialId: 12, paramValueIds: [207, 233] },
  { id: 130, materialId: 13, paramValueIds: [205, 226] }, // Бур по бетону 6
  { id: 131, materialId: 13, paramValueIds: [205, 231] },
  { id: 132, materialId: 13, paramValueIds: [205, 235] },
  { id: 133, materialId: 13, paramValueIds: [205, 239] },
  { id: 134, materialId: 13, paramValueIds: [207, 226] }, // Бур по бетону 8
  { id: 135, materialId: 13, paramValueIds: [207, 231] },
  { id: 136, materialId: 13, paramValueIds: [207, 235] },
  { id: 137, materialId: 13, paramValueIds: [207, 239] },
  { id: 138, materialId: 13, paramValueIds: [207, 243] },
  { id: 139, materialId: 13, paramValueIds: [208, 226] }, // Бур по бетону 10
  { id: 140, materialId: 13, paramValueIds: [208, 231] },
  { id: 141, materialId: 13, paramValueIds: [208, 235] },
  { id: 142, materialId: 13, paramValueIds: [208, 239] },
  { id: 143, materialId: 13, paramValueIds: [208, 243] },
  { id: 144, materialId: 13, paramValueIds: [208, 250] },
  { id: 145, materialId: 13, paramValueIds: [209, 226] }, // Бур по бетону 12
  { id: 146, materialId: 13, paramValueIds: [209, 231] },
  { id: 147, materialId: 13, paramValueIds: [209, 235] },
  { id: 148, materialId: 13, paramValueIds: [209, 239] },
  { id: 149, materialId: 13, paramValueIds: [209, 243] },
  { id: 150, materialId: 13, paramValueIds: [209, 250] },
  { id: 151, materialId: 13, paramValueIds: [209, 290] },
  { id: 152, materialId: 13, paramValueIds: [210, 226] }, // Бур по бетону 14
  { id: 153, materialId: 13, paramValueIds: [210, 231] },
  { id: 154, materialId: 13, paramValueIds: [210, 235] },
  { id: 155, materialId: 13, paramValueIds: [210, 239] },
  { id: 156, materialId: 13, paramValueIds: [210, 243] },
  { id: 157, materialId: 13, paramValueIds: [210, 250] },
  { id: 158, materialId: 13, paramValueIds: [210, 290] },
  { id: 159, materialId: 13, paramValueIds: [211, 235] }, // Бур по бетону 16
  { id: 160, materialId: 13, paramValueIds: [211, 239] },
  { id: 161, materialId: 13, paramValueIds: [211, 243] },
  { id: 162, materialId: 13, paramValueIds: [211, 250] },
  { id: 163, materialId: 13, paramValueIds: [211, 290] },
  { id: 164, materialId: 13, paramValueIds: [212, 239] }, // Бур по бетону 18
  { id: 165, materialId: 13, paramValueIds: [212, 243] },
  { id: 166, materialId: 13, paramValueIds: [212, 250] },
  { id: 167, materialId: 13, paramValueIds: [212, 290] },
  { id: 168, materialId: 13, paramValueIds: [213, 239] }, // Бур по бетону 20
  { id: 169, materialId: 13, paramValueIds: [213, 243] },
  { id: 170, materialId: 13, paramValueIds: [213, 250] },
  { id: 171, materialId: 13, paramValueIds: [213, 290] },
  { id: 172, materialId: 13, paramValueIds: [214, 239] }, // Бур по бетону 22
  { id: 173, materialId: 13, paramValueIds: [214, 243] },
  { id: 174, materialId: 13, paramValueIds: [214, 250] },
  { id: 175, materialId: 13, paramValueIds: [214, 290] },
  { id: 176, materialId: 13, paramValueIds: [222, 243] }, // Бур по бетону 25
  { id: 177, materialId: 13, paramValueIds: [222, 250] },
  { id: 178, materialId: 13, paramValueIds: [222, 290] },
  { id: 250, materialId: 15, paramValueIds: [] },
  { id: 260, materialId: 16, paramValueIds: [] },
  { id: 270, materialId: 17, paramValueIds: [] },
  { id: 280, materialId: 18, paramValueIds: [] },
  { id: 190, materialId: 19, paramValueIds: [207, 231] }, // Дюбель фасадный с шестигранным шурупом 8
  { id: 191, materialId: 19, paramValueIds: [207, 233] },
  { id: 192, materialId: 19, paramValueIds: [208, 231] }, // Дюбель фасадный с шестигранным шурупом 10
  { id: 193, materialId: 19, paramValueIds: [208, 233] },
  { id: 194, materialId: 19, paramValueIds: [208, 234] },
  { id: 195, materialId: 19, paramValueIds: [208, 236] },
  { id: 196, materialId: 19, paramValueIds: [208, 238] },
  { id: 197, materialId: 19, paramValueIds: [208, 239] },
  { id: 198, materialId: 19, paramValueIds: [208, 241] },
  { id: 290, materialId: 90, paramValueIds: [] },
  { id: 291, materialId: 91, paramValueIds: [] },
  { id: 292, materialId: 92, paramValueIds: [] },
  { id: 293, materialId: 93, paramValueIds: [] },
  { id: 294, materialId: 94, paramValueIds: [] },
  { id: 295, materialId: 95, paramValueIds: [] },
  { id: 296, materialId: 96, paramValueIds: [] },
  { id: 297, materialId: 97, paramValueIds: [] },
];
