# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

Приложение для расчёта и заявок на строительные материалы (zaiavka.xyz). Пользователь
выбирает систему работ (мокрый фасад, рамные леса), получает расчёт материалов,
ручного и электроинструмента, и выгружает заявку в таблицу.

Монорепозиторий: шесть NestJS-сервисов + Ionic/Vue-клиент за nginx, всё поднимается
одним `docker compose`.

## Запуск

Основной режим разработки — compose с hot-reload (`watch` синхронизирует `src/`
внутрь контейнеров, а изменения `package.json`/`tsconfig.json`/`nest-cli.json`/
`schema.prisma` пересобирают образ):

```bash
docker compose -f compose.dev.yaml -p matli-dev watch
```

```bash
docker compose -f compose.dev.yaml -p matli-dev build --no-cache
```

Поднять только часть стека (например, справочник):

```bash
docker compose -f compose.dev.yaml -p matli-dev up -d db dictionary-server
```

Всё приложение доступно на `http://localhost` (nginx). Adminer — `:8080`.

**Перед первым запуском** нужны env-файлы `secrets/{calc,order,user,dict,warehouse,company}-db/.db.env` —
каталог `secrets/` в `.gitignore`, в репозитории лежат только пустые папки. Сервисы
ждут `DB_HOST`, `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
(order/user дополнительно `DATABASE_URL` для Prisma; dictionary-server соберёт строку
подключения сам — см. `dictionary-server/src/db/config.ts`).

`JWT_SECRET` лежит отдельно — `secrets/jwt/.jwt.env`, compose подключает его только двоим:
user-server (подписывает токены) и nginx (проверяет их — см. «Авторизация на nginx»). Файл
обязателен, в том числе на проде. Без секрета user-server берёт случайный на каждый запуск
(токены не переживают рестарт), а nginx отвечает 503 на любой запрос с токеном. user-server дополнительно читает
`JWT_EXPIRES_IN` (по умолчанию `3d`; клиент раз в сутки от `iat` меняет токен на свежий
через `POST /auth/refresh` — `refreshDueAt()` в `ionic-client/src/store/authToken.ts`, — так что
вход живёт, пока человек заходит хоть раз в три дня) и `DEFAULT_ADMIN_LOGIN` / `DEFAULT_ADMIN_PASSWORD` /
`DEFAULT_ADMIN_FIRST_NAME`. Админа с id 1 сервис заводит сам при старте, если его нет;
без `DEFAULT_ADMIN_PASSWORD` пароль генерируется и печатается в лог контейнера один раз.
Существующего пользователя с id 1 старт не трогает — env не перезапишет сменённый пароль.

## Тесты, линт, сборка

`run-tests.sh` из корня прогоняет order-server и ionic-client целиком. Точечно:

|                | order-server / user-server / calc-server          | dictionary-server         | ionic-client                                                              |
| -------------- | ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| раннер         | Jest                                              | Vitest                    | Vitest + Cypress                                                          |
| все юнит-тесты | `npm run test`                                    | `npm run test`            | `npx vitest run`                                                          |
| один файл      | `npx jest src/zaiavka/zaiavka.controller.spec.ts` | `npx vitest run src/…`    | `npx vitest run tests/unit/components.spec.ts`                            |
| один кейс      | `npm run test -- -t "имя теста"`                  | `npx vitest run -t "имя"` | `npx vitest run -t "имя"`                                                 |
| e2e            | `npm run test:e2e` (свой jest-e2e.json)           | —                         | `npm run test:e2e` (cypress)                                              |
| линт           | `npm run lint` (с `--fix`)                        | то же                     | то же                                                                     |
| сборка         | `npm run build`                                   | то же                     | `npm run build` (сначала генерит sitemap, потом `vue-tsc` + `vite build`) |

Осторожно: `npm run test:unit` в ionic-client — это `vitest` **в watch-режиме**.
Для одного прогона используйте `npx vitest run`.

Проверить типы клиента без сборки: `npx vue-tsc --noEmit` в `ionic-client/`.

CI (`.github/workflows/test.yml`) гоняет на Node 22 order-server и ionic-client;
e2e клиента там закомментированы. Деплой — `./deploy.sh` из локальной сети (сервер
`192.168.1.49:22`): заливает закоммиченный `HEAD` через `git archive` и пересобирает
`compose.prod.yaml`. `deploy.yml` в Actions оставлен только на ручной запуск.

## Архитектура

### Границы сервисов

Каждый сервис вешает свой глобальный префикс и живёт на своём порту; nginx
раскладывает их по одному хосту (на проде наружу опубликован только он):

| Сервис            | Порт | Префикс         | Хранилище                 | Что делает                                          |
| ----------------- | ---- | --------------- | ------------------------- | --------------------------------------------------- |
| calc-server       | 4000 | `/calc/api/v1`  | голый `pg` + SQL-миграции | нормы расхода и логика расчёта                      |
| order-server      | 4100 | `/order/api/v1` | Prisma                    | заявки (`Zaiavka.data` — JSON), выгрузка в xlsx/ods |
| user-server       | 4200 | `/user/api/v1`  | Prisma                    | регистрация, вход, JWT                              |
| dictionary-server | 4300 | `/dict/api/v1`  | Drizzle                   | справочник позиций, типоразмеров, параметров        |
| warehouse-server  | 4400 | `/warehouse/api/v1` | Drizzle               | склады пользователей (только REST, клиента пока нет) |
| company-server    | 4500 | `/company/api/v1` | Drizzle                 | компании пользователей (только REST, клиента пока нет) |
| ionic-client      | 5173 | `/`             | —                         | Ionic + Vue 3                                       |

**calc-server не в этом репозитории.** `.gitignore` содержит `/calc-server/*`: код
лежит рядом на диске и собирается compose-ом, но версионируется отдельно, а в прод
уезжает готовым образом `dmprkp/calc-server:latest`. Правки там не попадут в коммит.

Кроме расчёта, calc-server отдаёт и правит **нормы расхода этапа** (`material_norms`,
`hand_tool_norms`, `power_tool_norms`): `GET /norms/stages/:stageId`, `PUT` того же адреса
(набор заменяется целиком, одной транзакцией) и
`POST /norms/stages/:id/copy-from/:sourceId`. Запись — с токеном; права calc-server
спрашивает у словаря (`module.dict/dictionary.client.ts`, `DICTIONARY_URL`) по технологии
этапа: своё — автору, любое — админу, чужое общее — `403`. Копия технологии в словаре
нормы не уносит — их переносит клиент (`components/pagesParts/catalog/technologyCopy.ts` → `copy-from`).
Названия к сборкам клиент берёт у словаря: `GET /{material,hand-tool}-variants?codes=`.
На клиенте технология и этап — страницы, не модалки: `/:locale/catalog/systems/:workType/:systemId`
(`CatalogTechnologyPage`, `new` — добавление) и вложенная `…/stages/:stageId` с нормами
(`CatalogStagePage`). В sitemap не идут — это записи словаря.

### Одна СУБД, шесть баз

Один контейнер Postgres держит базы `calc` (из `POSTGRES_DB`), `order`, `user`,
`dictionary`, `warehouse` и `company`. Остальные пять заводит `db/init/01-create-databases.sh` при первой
инициализации тома.

Отсюда главное ограничение: **межбазовых JOIN-ов и внешних ключей нет**. Справочник
недавно выехал из calc-server в свою базу, и нормы расхода ссылаются туда без FK:
этап — по `work_stage_id`, материал и ручной инструмент — по **коду сборки**
(`material_variant_code` / `hand_tool_variant_code`, `VARCHAR(64)`), электроинструмент —
по `power_tool_id`, потому что сборок у него нет.

Код, а не id, выбран намеренно. Код — это «позиция:значения параметров»
(`buildVariantCode`), то есть описание сборки: перепишут её параметры — код
пересчитается, норма от прежнего типоразмера не найдётся, и строка выпадет из расчёта.
По id норма молча досталась бы другому типоразмеру с прежним расходом. Опора кода —
неизменяемость `param_values` (см. раздел про словарь).

`calc-server/src/module.calc/repositories/calc.repository.ts` предупреждает в шапке: его
SQL всё ещё джойнит уехавшие таблицы, да ещё и по колонкам `*_variant_id`, которых
больше нет, — **в текущем виде не работает**. Следующий шаг: считать нормы локально, а
названия и параметры добирать у словаря по кодам, пропуская то, чего он не отдал.
Не считайте это багом, который надо чинить мимоходом.

### Три подхода к схеме БД — намеренно разные

**Пока проект не развёрнут, у каждого сервиса ровно одна миграция** — начальная.
Схема меняется правкой этой миграции (у словаря и Prisma — перегенерацией из схемы),
а базы пересоздаются: `docker compose -f compose.dev.yaml -p matli-dev down -v`
(том с данными уходит, `db/init` заводит базы заново). Досылающих миграций
не пишем и данные SQL-ом руками не чиним — всё, что должно быть в базе, лежит в
миграции или сидах.

- **dictionary-server** — Drizzle, единственный источник правды `src/db/schema.ts`,
  миграция — `drizzle/0000_init.sql` (`npm run db:generate`; прежний каталог `drizzle/`
  перед этим удалить, иначе появится вторая). Контейнер стартует с
  `npm run db:migrate && npm run db:seed` (`src/db/migrate.ts`, журнал —
  `drizzle.__drizzle_migrations`). Служебная `seed_history` объявлена в `schema.ts`,
  хотя из HTTP-API к ней никто не обращается: её ведёт только скрипт сидов.
  Локально: `npm run db:seed`, `npm run db:studio`.
- **order-server / user-server** — Prisma, одна миграция `prisma/migrations/0_init`
  (`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`),
  `npx prisma migrate deploy` при старте контейнера. `prisma/prisma.service.ts` лежит **вне** `src/`, из-за чего корень
  компиляции шире и артефакт получается `dist/src/main`, а не `dist/main`.
- **calc-server** — самописный раннер поверх `pg`: пронумерованные
  `NNN-name.{up,down,seed}.sql` в `src/module.db/{migrations,seed}`, отметки в
  `schema_migrations`. Схема — `001-init`; `000-schema_migrations` — таблица самого
  раннера, без неё он не стартует. Сначала применяется вся схема, потом все сиды; файл и отметка
  о нём — одна транзакция, упавшая миграция роняет старт.

Подробности по справочнику — в `dictionary-server/README.md` (таблицы, мягкое
удаление, правила сидов). Читайте его перед правками словаря.

### dictionary-server: генерируемые контроллеры

Все справочники (`materials`, `hand-tools`, `power-tools`, `units`, `param-kinds`,
`param-values`, `systems`, `work-stages`, `material-types`, `*-variants`) получают
одинаковый набор операций из фабрики `createDictionaryController()`
(`src/common/dictionary.controller.ts`) поверх `CrudService` (`src/common/crud.service.ts`).
Конкретный контроллер только наследуется и вешает свои `@Controller`/`@ApiTags` —
**без собственного декоратора класса TypeScript не эмитит `design:paramtypes`,
и Nest не сможет заинжектить сервис**.

Общее поведение, которое не надо переизобретать в каждом ресурсе:

- Иерархия структуры: `work_types` (вид работ: фасад, кровля, внутренняя отделка) →
  `systems` (в интерфейсе — «технологии работ», `work_type_id` NOT NULL) → `work_stages`.
  На клиенте — `/:locale/catalog/systems` (плитка видов из словаря) и
  `/:locale/catalog/systems/:workType` (технологии вида по его `code`). У технологии обязательная
  единица объёма (`unit_id`): список отдаёт её вложенной `unit`, а калькулятор
  (`/:locale/zaiavka/calculator/:workType/:system`) берёт её по `GET /systems/by-title/:title` и подписывает
  ею поля объёма (короткая форма — `measure.<code>` в i18n, `useUnitLabel()`).
  У технологий и этапов `title` — технический код (по нему ходит calc-server), людям
  показывается `name_ru`/`name_en`. Форма пишет только язык страницы, остальные
  остаются пустыми; хоть одно название обязательно (`CHECK *_name_present`). С клиента `title`
  не шлют — сервис генерирует его сам (`src/common/code.ts`).
- `authored: true` в опциях фабрики (сейчас у `work-types`, `systems`, `work-stages`, `materials`,
  `hand-tools` и `power-tools`) закрывает
  запись (`POST`/`PATCH`/`DELETE`/`restore`) гвардом `AuthGuard` (`src/auth/`), а
  создание проставляет `created_by` = `sub` из токена (его проверил nginx и передал
  `X-User-Id`). `created_by` без FK, из тела не принимается.
  Остальные справочники пока пишутся без входа.
- **Своё и общее** (`src/common/ownership.ts`, таблица — в README): у authored-справочников
  есть `is_shared`. Сиды и заведённое админом — общее, видят все; заведённое пользователем —
  только он и админ. Своё правится на месте и удаляется автором, любое — админом; правка
  пользователем чужого общего не трогает оригинал, а заводит ему копию (`CrudService.fork`,
  у материалов и инструмента — со сборками, у технологий — с этапами), и `PATCH` отвечает
  копией с новым id. Удалить чужое — `403`. Названия инструмента и материалов уникальны
  среди видимого владельцу (`modules/catalog/unique-names.ts`, в базе это не выразить):
  занято — `409`, создание с именем своей удалённой позиции её восстанавливает, копия без
  переименования получает «(копия)». У этапов и сборок своего флага нет, права —
  от технологии/позиции. Поэтому и на чтении словарю важно, кто спрашивает: глобальный
  `IdentifyGuard` кладёт пользователя из `X-User-*` в `request.user` (без них — аноним;
  на битый токен `401` отвечает ещё nginx), а `CrudService.list/byId` принимают его и фильтруют выдачу.
- **Фильтруем перечисление, не фильтруем разрешение ссылки.** Списки, поиск и подбор
  видимость учитывают; `GET /{material,hand-tool}-variants?ids=|codes=` и
  `GET /power-tools/lookup?ids=` — нет (`VariantsService.lookup`, `PowerToolsService.lookup`;
  архивные отдаются тоже, отсутствующих просто нет в ответе). Разделение на своё и общее существует, чтобы заведённое
  одним не засоряло списки другому, а не ради секретности: по точной ссылке, которая у
  спрашивающего уже есть, словарь отвечает всем одинаково. На этом держится расчёт —
  он детерминирован и не требует токена: результат не зависит от того, кто считает. Обратная
  сторона: чужая личная технология читается целиком тем, кто знает id её этапа (нормы
  и так открыты). Заведётся в справочнике что-то закрытое по содержанию — правило
  пересматривать вместе с `NormsController` в calc-server.
  На клиенте кнопка «Удалить» — только в формах правки (`MaterialModal`, `HandToolModal`,
  `VariantModal`, `CatalogTechnologyPage`), права там — `useOwnership()` по `sub`/`role` из токена.
- нарушение `UNIQUE`/FK в базе — `409` (`PgConstraintFilter`), а не `500`.
- язык ответа: любая пара `xRu`/`xEn` (в том числе во вложенных `unit`, `type`) уходит
  наружу одним полем `x` — `name`, `description` — на языке из `Accept-Language`
  (`LocalizeInterceptor`, `src/common/localize.ts`). Неизвестный язык — `ru`; на
  запрошенном пусто — ближайшее заполненное: сначала `ru`, потом остальные.
  Писать по-прежнему оба поля. Клиент шлёт язык из URL (`BaseModel.setLocale`, его
  зовёт `setI18nLocale`), поэтому страницы со справочником перечитывают данные при
  смене языка — сами `nameRu`/`nameEn` на клиенте не выбирают и ничего из данных
  словаря через i18n не переводят. Исключение одно — форма правки: ей нужны оба
  языка, и она просит их `?translations=all` (сворачивание отключается).

- `DELETE /:id` — мягкое (`is_active = false`), `?hard=true` — физическое с `409`
  и списком мешающих ссылок. Ссылки из норм расхода в calc-server отсюда не видны.
- `POST /:id/restore` возвращает архивную позицию.
- списки — пагинация `?page` / `?limit` (по умолчанию 50, максимум 200), поиск `?q=`
  и фильтр `?state=active|archived|all`, где `active` — умолчание, то есть мягко
  удалённые не видны, пока их не попросят.

Валидация целиком на Zod (`nestjs-zod`), `ValidationPipe` с class-validator тут
намеренно не используется. Документация: `/dict/api/v1/docs` (Scalar),
спека `/dict/api/v1/openapi.json`.

Ручной инструмент и материалы заводятся сразу со сборками (`POST /hand-tools`, `POST /materials`
с `variants` — список наборов параметров, одна транзакция; пустой — служебная сборка без
параметров). В расчёт идёт сборка (`7:227`), а не сама позиция (`7`). Запись сборок закрыта
тем же `AuthGuard`, что и у позиций.
Параметры с клиента идут тройками `{ kindId, unitId, value }`: id значения клиент не знает,
`VariantsService.resolveParams` находит его в `param_values` или заводит. Правка типоразмера —
`PUT /{hand-tools|materials}/:id/variants/:variantId`: набор заменяется целиком, `id` прежний,
`code` пересчитывается — и норма расхода, которая ссылалась прежним кодом, отвязывается.

Сборки по списку отдаёт `GET /{material,hand-tool}-variants` — ровно один из `?ids=` или
`?codes=`. Нормам расхода нужен второй; `?ids=` остаётся для внутренних ссылок словаря.
Электроинструмент сборок не имеет, и нормы ссылаются на него id позиции — для них отдельный
`GET /power-tools/lookup?ids=` (не `?ids=` на списке: тот отдаёт страницу и фильтрует видимость).

`code` типоразмера **нигде не хранится в данных** — он вычисляется
`buildVariantCode()` из `src/modules/catalog/variant-code.ts`, одной и той же функцией
для API и для сидов. Не вводите руками. `id` в сидах проставлены явно, потому что на
них ссылаются нормы расхода из чужой базы.

Вид параметра (длина, диаметр, напряжение) живёт на `param_values.kind_id`, а **не**
на связке типоразмера со значением: пока он был на связке, одно «8 мм» помечалось
`diameter` у одного материала и `length` у другого. Уникальность значений — по тройке
`(kind_id, value, unit_id)` с `NULLS NOT DISTINCT`, так что «100 мм длины» и
«100 мм ширины» это две законные строки, а два одинаковых значения — отказ.

Значение параметра **неизменяемо**: `PATCH /param-values/:id` отвечает `405`
(`immutable` в `createDictionaryController`). Его id входит в код сборки, а код — ссылка
из норм расхода: правка «8 мм» на «10 мм» на месте оставила бы и id, и все коды
прежними, молча подменив смысл каждой сборки с этим значением. Нужно другое число —
заводится другое значение, а удалить используемое не даст `CrudService.remove` (409).

Сиды (`src/db/seed.ts`) — именованные шаги, каждый в своей транзакции и с отметкой
в `seed_history`: контейнер гоняет `db:seed` при каждом старте, а том переживает
рестарт, так что без отметок вторая заливка падала бы на duplicate key. Правка уже
применённого шага до базы не доедет — данные чинятся правкой сидов и пересозданием
базы (`down -v`), а не досылкой.

### warehouse-server: склады

Каркас — от dictionary-server (Drizzle, Zod, `PgConstraintFilter`, пагинация), но без
Scalar/OpenAPI и локализации. `AuthGuard` висит глобально: анонимного чтения нет.
Склад — владельца (`owner_id` = `sub`), список — только свои (у админа тоже), по id админ
видит любой, чужой остальным — `404`. `db:migrate` сам заводит базу `warehouse`, если её нет:
`db/init` на живом томе не срабатывает. Подробности — `warehouse-server/README.md`.

### company-server: компании

Копия каркаса warehouse-server (тот же глобальный `AuthGuard`): у компании `name`,
`created_at`/`updated_at`, владельца на самой компании нет. Участники — `company_members`
(`user_id` без FK, `roles[]` из `own | manage | review | store`) в той же базе, поэтому
создание компании с владельцем и правка ролей — одна транзакция, без саги. Создатель
получает `own`; `own`/`manage` раздаёт только владелец, `review`/`store` — и управляющий;
последнего владельца не снять (`409`). Не участник компании не видит (`404`), админ — как
владелец. Правила — `src/modules/companies/roles.ts`, подробности — `company-server/README.md`.

### Авторизация на nginx

Токен user-server проверяет nginx, а не сервисы: `nginx/njs/auth.js` (njs, модуль есть в
официальном образе; `auth_jwt` — только в платном NGINX Plus) сверяет подпись HS256 с
`JWT_SECRET`, `exp`/`nbf` и форму payload и передаёт итог заголовками `X-User-Id` /
`X-User-Role`. Подключается сниппетом `nginx/snippets/gateway-auth.conf` в location каждого
сервиса; модуль и `env JWT_SECRET` — в `nginx/main.conf` (main-контекст, в conf.d нельзя).
Без токена — аноним (заголовков нет, присланные клиентом затираются), битый — `401` от
nginx, токен без секрета у nginx — `503`. **user-server в это не входит**: он выпускает
токены, проверяет их сам (и роль берёт из базы), а вход с протухшим токеном в заголовке
не должен падать `401`.

Сервисы секрета не знают и заголовкам верят: `userFromHeaders()` в `src/auth/auth-user.ts`
(у calc-server — `module.auth/`), общего пакета нет — файл продублирован. Логина в заголовках
нет, `AuthUser` — только `{ id, role }`. Вызов сервис → сервис идёт мимо nginx и передаёт
`X-User-*` сам (calc-server → словарь, `dictionary.client.ts`). Всё это держится на том, что
**на проде порты сервисов наружу закрыты** (`expose` вместо `ports` в `compose.prod.yaml`):
открыть порт «для отладки» — значит дать подделать любого пользователя. В dev порты открыты
намеренно, и заголовок там подделывается.

Тесты скрипта — `nginx/njs/auth.test.js`, тем же njs, что в образе (в njs 0.8 нет ни
деструктуризации, ни `for…of`):

```bash
docker run --rm -v "$PWD/nginx/njs:/njs" nginx:1.25.3 njs -p /njs /njs/auth.test.js
```

### order-server: заявки

Заявка принадлежит автору — `user` = `X-User-Id` от nginx (`src/auth/`; из тела не принимается). Без входа `POST /zaiavka` заводит **ничью** (`user = NULL`) и один раз
отдаёт ключ правки `key`; в базе — только его sha256 (`editKeyHash`, наружу не уходит). `PUT /zaiavka/:id`:
своя — автору, любая — админу, ничья — по заголовку `X-Zaiavka-Key`, иначе `403`.
`GET /zaiavka` — свои, со входом (и у админа тоже); `GET /zaiavka?ids=` и `GET /zaiavka/:id` открыты —
по id заявкой делятся в мессенджерах, то же правило «фильтруем перечисление, не ссылку», что в словаре.
`POST /zaiavka/claim` (`{ items: [{ id, key }] }`, со входом) забирает ничьи с верным ключом себе.
Ничьи старше 30 дней с последней правки сервис удаляет сам — при старте и раз в сутки.

Клиент сохраняет сам, кнопки «сохранить» нет (`useZaiavkaAutosave` на странице расчёта):
сразу после расчёта, дальше раз в 10 секунд, если поменялось, и при уходе со страницы
(`keepalive`). id заявки — в query `zaiavka`, чтобы перезагрузка не заводила вторую. Без входа
браузер помнит только `{ id, key }` ничьих заявок (`models/zaiavka/anonymousKeys.ts`, localStorage),
после входа `claimAnonymous()` забирает их себе.

### user-server: авторизация

Вход по `login` (хранится в нижнем регистре), обязательны `login`, `password`,
`firstName`, необязательна `lastName`; роль `USER | ADMIN`, при регистрации всегда `USER`.
Эндпоинты: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`,
`POST /auth/refresh` (свежий токен взамен ещё живого, пользователь перечитывается из базы),
`POST /auth/change-password`, `GET /users` (только `ADMIN`).

`AuthGuard` висит глобально (`APP_GUARD`): закрыто всё, что не помечено `@Public()`,
роли — `@Roles(Role.ADMIN)`, текущий пользователь — `@CurrentUser()`. Роль гвард берёт
из базы, а не из токена; в токене (`sub`, `login`, `role`) она для других сервисов.
Пользователь наружу отдаётся только через `toPublicUser()` — без хеша пароля.

### ionic-client

- **Роутинг**: локаль — часть URL (`/:locale/...`). Глобальный `beforeEach` в
  `src/router/index.ts` догружает словарь и подменяет неизвестный сегмент;
  `afterEach` собирает ключ вида `catalog/materials` или `zaiavka/calculator/facade/EIFS` из пути
  и достаёт по нему SEO-описание из `src/router/constants.ts`. Добавили роут,
  который должен индексироваться, — добавьте ключ туда и путь в `generate-sitemap.cjs`
  (он мирроро́к роутера, синхронизируется вручную). Электроинструмент — табы по питанию,
  и они тоже адрес: `/:locale/catalog/power_tools/{corded|cordless}` (роут
  `catalog-power-tools`, список — `POWER_TOOL_CURRENTS`); голый `power_tools` уводит на `corded`.
- **Калькулятор — внутри «Заявок»**: `/:locale/zaiavka` — список и кнопка «Новая заявка»,
  она ведёт в `/:locale/zaiavka/calculator/:workType/:system/materialList` (`CalculatorPage` →
  `SystemsPage` → `ComponentsPage` → `MaterialListPage`); `:zaiavka` — только цифры. Отдельной
  вкладки калькулятора в нижнем меню нет. `/:locale/main` — пустая `MainPage`, туда ведёт только
  логотип; старые `/main/...` редиректят в калькулятор с сохранением query. Стартовая — `zaiavka`.
- **Второй гвард** — в `src/main.ts`, авторизационный. Сейчас отключён флагом
  `AUTH_ENABLED = false` (`src/constants/auth.ts`): стор, страница входа, модель и
  роут целы, проверка просто пропускается. Флаг в `true` — авторизация возвращается.
- **API**: `BaseModel` (fetch + `baseURL`), от него наследуются `DictionaryModel`,
  `BaseCalcModel`, `BaseZaiavkaModel`, `AuthModel` — каждый задаёт только свой
  `apiVersion` (= префикс сервиса). URL клеятся встык, поэтому путь обязан начинаться
  со слэша. `BaseModel.get()` **глотает сетевую ошибку и возвращает `undefined`** —
  вызывающий код обязан это учитывать (см. `CatalogPage.load()`).
- **Компоненты Ionic регистрируются глобально** в `src/main.ts` (`IonContent`,
  `IonItem`, `IonList`, `IonSegment`…). В `.vue`-файлах импортируются только те, чего
  в этом списке нет. Не добавляйте лишние импорты — и не забывайте регистрацию, если
  используете новый компонент повсеместно.
- **i18n**: словари `src/plugins/i18n/locales/*.json` грузятся отдельными чанками по
  требованию; ключи страниц — `pages.<page>.*`. Единая точка смены языка —
  `setI18nLocale()`.
- **Тема** (`src/plugins/theme/`) устроена так же и по той же причине: класс `dark`
  на `<body>` плюс кука `theme_mode`. Применяет её `applyInitialTheme()` в `main.ts`,
  а не компонент-переключатель, — он живёт в модалке настроек, и будь применение
  в нём, тема вставала бы только после её открытия. Кука пишется лишь при явном
  выборе: системную тему не сохраняем, иначе она залипает при смене системной.
  Шаговых цветов (`--ion-color-step-*`) тёмная тема для `md` не задаёт: компоненты,
  которые красят ими текст (поиск, заголовок карточки), получают светлый запасной
  `#262626` и сливаются с фоном. Закрыто точечными правилами `body.dark ion-searchbar`,
  `ion-card-title` и `ion-note` в `theme/variables.css` — новый такой компонент туда же.
- **Шрифт** — Russo One (`@fontsource/russo-one`, OFL, есть кириллица) на всё приложение
  через `--ion-font-family` в `theme/variables.css`; своих `font-family` в компонентах нет.
  У шрифта одно начертание, поэтому `font-weight` ничего не меняет (синтетический жирный
  выключен `font-synthesis-weight: none`), а `font-style: italic/oblique` браузер не рисует —
  наклон делается `transform: skewX(...)`, как в `CutCornerBtn` и `TitledDivider`.
  Кнопки «Добавить …» — либо `CutCornerBtn`, либо `ion-button class="add_btn"` с текстом
  в `<span class="slanted">` (общие классы там же, в `variables.css`) — новую такую туда же.
- **Настройки — не роут, а `ion-modal`** (`components/nav/SettingsModal.vue`): язык,
  тема, профиль. Открывается аватаром справа в шапке (`SettingsAvatar.vue`), а сама
  модалка и флаг «открыта» живут в корне `App.vue`, не внутри шапки. Старый адрес
  `/:locale/settings` оставлен редиректом на главную — он был в sitemap.
- Алиас `@/` → `src/`.

## Соглашения

- Комментарии в активно развиваемых частях (dictionary-server, calc-server,
  ionic-client, compose-файлы) — **на русском**, и объясняют «почему», а не «что»:
  чаще всего это зафиксированные грабли. Держите тот же тон и не переводите их.
- Алиас `~/*` → корень исходников в NestJS-сервисах, `@/*` → `src/` в клиенте.
- Prettier: dictionary-server — свой `.prettierrc` (`printWidth: 110`, одинарные
  кавычки); клиент форматируется настройками из `.vscode/settings.json`
  (`singleAttributePerLine`, `vueIndentScriptAndStyle`) — отсюда вертикальные
  атрибуты в шаблонах.
- Свой `eslint.config.*` у каждого сервиса, общего корневого нет.

## Известные мины

- `npm run lint` в ionic-client падает на Node 16 (`structuredClone is not defined`
  внутри ESLint 9). Нужен Node ≥ 18; CI использует 22.
- Vite-овский HMR WebSocket не проходит через dev-nginx — в консоли на
  `http://localhost` всегда висят ошибки `ws://localhost:undefined`. Это не регрессия.
- `config/mqtt/mosquitto.conf` ни на что не подключён: ни сервиса в compose, ни
  ссылок в коде. `.github/copilot-instructions.md` устарел — обещает каталог
  `shared/`, которого нет, интеграцию с MQTT, которой нет, и не знает про
  user-server и dictionary-server.
- Версия Postgres в compose закреплена (`postgres:18-alpine`) намеренно: незакреплённый
  тег однажды принёс новый мажор, не читающий старый каталог данных.
