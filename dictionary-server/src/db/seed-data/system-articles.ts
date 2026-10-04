/**
 * Тексты страниц технологий (systems.article_ru/en) — начальное наполнение, дальше их
 * правят в админке. Разметка — structure/article.ts: «## » — заголовок, пустая строка —
 * новый абзац. Числа — из норм calc-server (seed/004–010): текст не должен расходиться
 * с тем, что посчитает калькулятор.
 */
export const systemArticles: Record<string, { ru: string; en: string }> = {
  EIFS: {
    ru: `## Что такое мокрый фасад (СФТК)
Мокрый фасад — это система фасадная теплоизоляционная композиционная с тонким штукатурным слоем, сокращённо СФТК. Утеплитель приклеивают к стене и дополнительно крепят тарельчатыми дюбелями, поверх него делают армирующий слой из клеевой смеси со стеклосеткой, затем наносят декоративную штукатурку и окрашивают. «Мокрым» фасад называют потому, что все слои делаются растворами из сухих смесей.

Калькулятор считает расход материалов и инструмент на вашу площадь по нормам на 1 м². Результат сразу становится заявкой на материалы: её можно выгрузить в таблицу, отправить ссылкой или передать на склад компании.

## Как считается расход
Материал: норма на 1 м² умножается на площадь этапа. Площадь можно задать одну на все слои или для каждого слоя свою — например, если красить будут только часть фасада.

Инструмент считается не от площади, а на звено бригады: норма — сколько штук нужно одному звену, она умножается на число звеньев. Если инструмент нужен на нескольких этапах, в заявку попадает наибольшее количество, а не сумма: шпатели и вёдра переходят с этапа на этап.

Позиции с нулевым расходом остаются в списке намеренно. Их количество зависит от конкретного здания, а в заявке они напоминают, что их нужно посчитать.`,
    en: `## What is EIFS (wet facade)
EIFS — an exterior insulation and finish system, often called a wet facade. Insulation boards are glued to the wall and fixed with anchors, then covered with a base coat of adhesive with fiberglass mesh, a decorative render and paint. It is called wet because every layer is applied as a mortar mixed from dry mixes.

The calculator works out materials and tools for your facade area from consumption rates per 1 m². The result becomes a material request right away: export it to a spreadsheet, send it by link or pass it to the company warehouse.

## How consumption is calculated
Materials: the rate per 1 m² is multiplied by the stage area. Set one area for all layers or a separate one for each layer — for example, when only part of the facade is painted.

Tools are counted per crew unit, not per area: the rate is how many pieces one crew unit needs, multiplied by the number of units. When a tool is needed at several stages, the request gets the largest quantity, not the sum — trowels and buckets move from stage to stage.

Items with zero consumption stay in the list on purpose. Their quantity depends on the particular building, and in the request they remind you to count them.`,
  },

  frame_scaffold: {
    ru: `## Что такое рамные строительные леса
Рамные леса собирают из стальных рам 2070 × 1020 мм — с лестницей и без, — диагональных и горизонтальных связей, опорных пят, ригелей длиной 3 м и щитов деревянного настила 1 × 1 м. Ячейка лесов — 2 × 3 м. На таких лесах утепляют и штукатурят фасад, монтируют облицовку, ремонтируют карнизы и свесы.

Калькулятор считает комплект лесов на площадь фасада: сколько рам, связей, ригелей, щитов и кронштейнов крепления к стене нужно заказать в аренду или купить. Результат — заявка, которую можно выгрузить в таблицу или отправить ссылкой.

## Как считается комплект
Количество каждого элемента — норма на 1 м² фасада, умноженная на площадь, которую нужно закрыть лесами. На 1 м² приходится 0,07 рамы с лестницей, 0,12 рамы без лестницы, 0,175 диагональной и 0,35 горизонтальной связи, 0,35 ригеля и 0,5 щита настила.

Леса крепят к стене кронштейнами — 0,092 шт. на 1 м², к каждому анкер и бур под него. Опорные пяты зависят от длины фасада, а не от площади, поэтому их количество указывают вручную.

Инструмент считается на звено монтажников, а не на площадь: норма умножается на число звеньев.`,
    en: `## What is frame scaffolding
Frame scaffolding is assembled from 2070 × 1020 mm steel frames — with and without a ladder — diagonal and horizontal braces, base plates, 3 m ledgers and 1 × 1 m wooden deck boards. One scaffold bay is 2 × 3 m. It is used for insulating and rendering facades, installing cladding and repairing eaves.

The calculator works out a scaffold set for the facade area: how many frames, braces, ledgers, deck boards and wall brackets to rent or buy. The result is a request you can export to a spreadsheet or send by link.

## How the set is calculated
Each component is a rate per 1 m² of facade multiplied by the area to be covered. Per 1 m² there are 0.07 frames with a ladder, 0.12 frames without a ladder, 0.175 diagonal and 0.35 horizontal braces, 0.35 ledgers and 0.5 deck boards.

The scaffold is tied to the wall with brackets — 0.092 per 1 m², each with an anchor and a drill bit for it. Base plates depend on the facade length rather than its area, so their quantity is entered manually.

Tools are counted per crew unit, not per area: the rate is multiplied by the number of units.`,
  },

  GKL_C112: {
    ru: `## Что такое перегородка С112
С112 — перегородка из гипсокартона на одинарном металлическом каркасе с двухслойной обшивкой ГКЛ с каждой стороны. Каркас собирают из направляющих профилей ПН по полу и потолку и стоечных профилей ПС с шагом 600 мм, полость заполняют минераловатной звукоизоляционной плитой.

Толщину перегородки задаёт ширина профиля — 50, 75 или 100 мм. Вся перегородка выходит на 50 мм толще: по два листа 12,5 мм с каждой стороны.

Калькулятор считает профили, листы ГКЛ, шурупы, дюбели, уплотнительную ленту, шпаклёвку, армирующую ленту для швов и грунтовку на площадь перегородки, а также инструмент для звена.

## Как считается расход
Выберите толщину перегородки: от неё зависит типоразмер профилей и уплотнительной ленты. Погонные метры профиля на 1 м² задаёт шаг стоек, поэтому они не меняются, как и листы, крепёж и шпаклёвка.

Расход материала — норма на 1 м² перегородки, умноженная на площадь этапа: разметки, каркаса, обшивки первым и вторым слоем, заделки швов. Инструмент считается на звено и умножается на число звеньев.

Предельная высота, звукоизоляция и огнестойкость перегородок разной толщины отличаются. Это выбор конструкции по проекту — калькулятор считает только расход.`,
    en: `## What is a C112 partition
C112 is a drywall partition on a single metal frame with two layers of gypsum board on each side. The frame is made of track profiles along the floor and ceiling and studs at 600 mm centres; the cavity is filled with mineral acoustic insulation.

The partition thickness is set by the profile width — 50, 75 or 100 mm. The whole partition is 50 mm thicker: two 12.5 mm boards on each side.

The calculator works out profiles, boards, screws, anchors, sealing tape, joint filler, joint tape and primer for the partition area, plus tools for the crew.

## How consumption is calculated
Choose the partition thickness: it sets the size of the profiles and the sealing tape. The running metres of profile per 1 m² depend on the stud spacing, so they stay the same, as do boards, fixings and filler.

Material consumption is the rate per 1 m² of partition multiplied by the stage area: layout, frame, first and second board layer, joint filling. Tools are counted per crew unit and multiplied by the number of units.

Maximum height, sound insulation and fire rating differ between thicknesses. That is a design choice — the calculator only works out consumption.`,
  },

  aerated_concrete: {
    ru: `## Что такое перегородка из газобетона
Перегородку кладут из автоклавных газобетонных блоков 600 × 250 мм марки D500 на тонкошовный клей со швом 1–3 мм. Над дверными проёмами ставят перемычки, к несущим стенам перегородку крепят гибкими перфорированными связями, зазор под перекрытием заполняют монтажной пеной.

Калькулятор считает блоки, клей, перемычки и крепёж на площадь перегородки и инструмент для звена: каретку для клея, ножовку и тёрку по газобетону, киянку.

## Как считается расход
Выберите толщину перегородки — 80, 100 или 150 мм. Блоки и клей нормируются на кубометр кладки, поэтому их расход растёт с толщиной: на 1 м² перегородки толщиной 150 мм — 0,1575 м³ блоков с запасом 5% на подрезку и бой и 3,75 кг клея.

Перемычка — на выбор: заводская армированная для толщин 100 и 150 мм, стальной уголок полкой вверх, единственный вариант при 80 мм, или монолитная из арматуры и цементно-песчаной смеси. Длина перемычки — ширина проёма плюс 500 мм: по 250 мм опирания с каждой стороны.

Число проёмов, длина примыканий и высота перегородки из площади не выводятся, поэтому перемычки и крепление к стенам стоят в заявке с нулём — их количество указывают вручную.`,
    en: `## What is an aerated concrete partition
The partition is laid from autoclaved aerated concrete blocks 600 × 250 mm, density D500, on thin-bed adhesive with 1–3 mm joints. Lintels go over door openings, perforated ties fix the partition to the structural walls, and the gap under the slab is filled with polyurethane foam.

The calculator works out blocks, adhesive, lintels and fixings for the partition area, plus crew tools: adhesive applicator, aerated concrete saw and float, rubber mallet.

## How consumption is calculated
Choose the partition thickness — 80, 100 or 150 mm. Blocks and adhesive are rated per cubic metre of masonry, so their consumption grows with thickness: per 1 m² of a 150 mm partition — 0.1575 m³ of blocks with 5% for cutting and breakage, and 3.75 kg of adhesive.

The lintel is your choice: a factory reinforced lintel for 100 and 150 mm, a steel angle flange up — the only option at 80 mm — or a cast-in-place one from rebar and cement-sand mix. Lintel length is the opening width plus 500 mm: 250 mm of bearing on each side.

The number of openings, junction length and partition height cannot be derived from the area, so lintels and wall ties stay at zero in the request — enter their quantity manually.`,
  },

  metal_tile: {
    ru: `## Что такое кровля из металлочерепицы
Металлочерепица — профилированный стальной лист с полимерным покрытием. Его укладывают на разреженную обрешётку из досок, под ней — контробрешётка из бруска вдоль стропил и подкровельная гидроизоляционная плёнка. Контробрешётка даёт вентзазор, через который уходит влага из-под листов.

Калькулятор считает плёнку, брусок и доску, гвозди, листы, кровельные саморезы и герметик на площадь кровли, а также доборные элементы и инструмент для звена.

## Как считается расход
Нормы — по ГЭСН 12-01-020-01 в пересчёте на 1 м² ската. Листов нужно 1,26 м² на 1 м² кровли: лист режется по шагу волны, и на вальмовых скатах отходы доходят до трети. Плёнки — 1,16 м² с нахлёстами, кровельных саморезов — 10 шт. (производители пишут 6–8).

Конёк, ендовы, карнизные и торцевые планки, уплотнитель и снегозадержатели зависят от длины конька, ендов и свесов, а не от площади ската. В заявке они стоят с нулём, длину указывают вручную.

Материал — норма на 1 м², умноженная на площадь этапа. Инструмент — на звено, умножается на число звеньев.`,
    en: `## What is a metal tile roof
Metal tile is a profiled steel sheet with a polymer coating. It is laid on spaced board battens over counter battens along the rafters and a roofing membrane. The counter battens leave a vent gap that carries moisture out from under the sheets.

The calculator works out membrane, battens and boards, nails, sheets, roofing screws and sealant for the roof area, plus flashings and crew tools.

## How consumption is calculated
Rates follow the Russian estimating standard GESN 12-01-020-01, converted to 1 m² of slope. Sheets need 1.26 m² per 1 m² of roof: sheets are cut by the profile step, and on hip roofs waste reaches a third. Membrane — 1.16 m² with laps, roofing screws — 10 pcs (manufacturers state 6–8).

Ridge, valleys, eaves and rake flashings, filler and snow guards depend on the length of the ridge, valleys and edges rather than the slope area. They stay at zero in the request — enter the length manually.

Materials are the rate per 1 m² multiplied by the stage area. Tools are counted per crew unit and multiplied by the number of units.`,
  },

  shingles: {
    ru: `## Что такое кровля из гибкой черепицы
Гибкая черепица — битумные гонты, которые прибивают кровельными гвоздями к сплошному основанию из плит ОСП. Под черепицу по всему скату укладывают подкладочный ковёр, в ендовах и на примыканиях — усиливающий ендовый ковёр, нахлёсты проклеивают битумной мастикой.

Калькулятор считает плиты ОСП, саморезы, подкладочный ковёр, черепицу и гвозди на площадь кровли, а также карнизные и фронтонные планки, коньковую черепицу, аэраторы и инструмент для звена.

## Как считается расход
На 1 м² ската — 1,05 м² ОСП-3 с запасом 5% на подрезку, 1,1 м² подкладочного ковра с нахлёстами и 1,1 м² черепицы с запасом 10%. Для вальмовой и сложной кровли запас на черепицу берут 15%. Гвоздей на черепицу — 35 шт. на 1 м²: по четыре на гонт, в ветровой зоне и на крутых скатах — по шесть.

Карнизы, фронтоны, ендовы, конёк и примыкания считаются по погонным метрам и зависят от формы крыши, а не от площади ската. В заявке они стоят с нулём — длину указывают вручную.

Материал — норма на 1 м², умноженная на площадь этапа. Инструмент — на звено, умножается на число звеньев.`,
    en: `## What is a flexible shingle roof
Flexible shingles are bituminous strips nailed with roofing nails to a continuous OSB deck. An underlayment covers the whole slope, a reinforcing valley underlayment goes into valleys and abutments, and laps are sealed with bituminous mastic.

The calculator works out OSB boards, screws, underlayment, shingles and nails for the roof area, plus eaves and rake edges, hip and ridge shingles, roof vents and crew tools.

## How consumption is calculated
Per 1 m² of slope — 1.05 m² of OSB-3 with 5% for cutting, 1.1 m² of underlayment with laps and 1.1 m² of shingles with 10% waste. Hip and complex roofs take 15% waste for shingles. Shingle nails — 35 per 1 m²: four per shingle, six in high-wind zones and on steep slopes.

Eaves, rakes, valleys, ridge and abutments are counted in running metres and depend on the roof shape rather than the slope area. They stay at zero in the request — enter the length manually.

Materials are the rate per 1 m² multiplied by the stage area. Tools are counted per crew unit and multiplied by the number of units.`,
  },
};
