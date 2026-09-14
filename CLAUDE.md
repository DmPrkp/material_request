# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

Приложение для расчёта и заявок на строительные материалы (zaiavka.xyz). Пользователь
выбирает систему работ (мокрый фасад, рамные леса), получает расчёт материалов,
ручного и электроинструмента, и выгружает заявку в таблицу.

Монорепозиторий: четыре NestJS-сервиса + Ionic/Vue-клиент за nginx, всё поднимается
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

**Перед первым запуском** нужны env-файлы `secrets/{calc,order,user,dict}-db/.db.env` —
каталог `secrets/` в `.gitignore`, в репозитории лежат только пустые папки. Сервисы
ждут `DB_HOST`, `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
(order/user дополнительно `DATABASE_URL` для Prisma; dictionary-server соберёт строку
подключения сам — см. `dictionary-server/src/db/config.ts`).

`JWT_SECRET` лежит отдельно — `secrets/jwt/.jwt.env`, compose подключает его и user-server
(подписывает токены), и dictionary-server (проверяет их). Файл обязателен, в том числе на
проде. Без секрета user-server берёт случайный на каждый запуск (токены не переживают
рестарт), а справочник отвечает 503 на любую запись. user-server дополнительно читает
`JWT_EXPIRES_IN` (по умолчанию `1h`) и `DEFAULT_ADMIN_LOGIN` / `DEFAULT_ADMIN_PASSWORD` /
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
раскладывает их по одному хосту:

| Сервис            | Порт | Префикс         | Хранилище                 | Что делает                                          |
| ----------------- | ---- | --------------- | ------------------------- | --------------------------------------------------- |
| calc-server       | 4000 | `/calc/api/v1`  | голый `pg` + SQL-миграции | нормы расхода и логика расчёта                      |
| order-server      | 4100 | `/order/api/v1` | Prisma                    | заявки (`Zaiavka.data` — JSON), выгрузка в xlsx/ods |
| user-server       | 4200 | `/user/api/v1`  | Prisma                    | регистрация, вход, JWT                              |
| dictionary-server | 4300 | `/dict/api/v1`  | Drizzle                   | справочник позиций, типоразмеров, параметров        |
| ionic-client      | 5173 | `/`             | —                         | Ionic + Vue 3                                       |

**calc-server не в этом репозитории.** `.gitignore` содержит `/calc-server/*`: код
лежит рядом на диске и собирается compose-ом, но версионируется отдельно, а в прод
уезжает готовым образом `dmprkp/calc-server:latest`. Правки там не попадут в коммит.

### Одна СУБД, четыре базы

Один контейнер Postgres держит базы `calc` (из `POSTGRES_DB`), `order`, `user` и
`dictionary`. Последние три заводит `db/init/01-create-databases.sh` при первой
инициализации тома.

Отсюда главное ограничение: **межбазовых JOIN-ов и внешних ключей нет**. Справочник
недавно выехал из calc-server в свою базу, и нормы расхода теперь ссылаются на
`work_stage_id` / `*_variant_id` обычными `INTEGER` без FK. `calc-server/src/module.calc/repositories/calc.repository.ts`
об этом честно предупреждает в шапке: его SQL всё ещё джойнит уехавшие таблицы и
**в текущем виде не работает**; следующий шаг по замыслу автора — научить словарь
исполнять эти запросы, а репозиторий превратить в клиента к нему. Не считайте это
багом, который надо чинить мимоходом.

### Три подхода к схеме БД — намеренно разные

- **dictionary-server** — Drizzle, единственный источник правды `src/db/schema.ts`.
  В dev контейнер стартует с `drizzle-kit push --force && npm run db:seed`: схема
  синхронизируется без миграций (режим прототипа). `push --force` **сносит из базы
  всё, чего нет в схеме** — поэтому служебная `seed_history` объявлена в `schema.ts`,
  хотя из HTTP-API к ней никто не обращается: её ведёт только скрипт сидов.
  Локально: `npm run db:seed`, `npm run db:studio`, `npm run db:generate`
  (когда перейдёте на миграции).
- **order-server / user-server** — Prisma, `npx prisma migrate deploy` при старте
  контейнера. `prisma/prisma.service.ts` лежит **вне** `src/`, из-за чего корень
  компиляции шире и артефакт получается `dist/src/main`, а не `dist/main`.
- **calc-server** — самописный раннер поверх `pg`: пронумерованные
  `NNN-name.{up,down,seed}.sql` в `src/module.db/{migrations,seed}`, отметки в
  `schema_migrations`. Сначала применяется вся схема, потом все сиды; файл и отметка
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
  `/:locale/catalog/systems/:workType` (технологии вида по его `code`).
  У технологий и этапов `title` — технический код (по нему ходит calc-server), людям
  показывается `name_ru`/`name_en`. Форма пишет только язык страницы, остальные
  остаются пустыми; хоть одно название обязательно (`CHECK *_name_present`). С клиента `title`
  не шлют — сервис генерирует его сам (`src/common/code.ts`).
- `authored: true` в опциях фабрики (сейчас у `work-types`, `systems` и `work-stages`) закрывает
  запись (`POST`/`PATCH`/`DELETE`/`restore`) гвардом `JwtAuthGuard` (`src/auth/`), а
  создание проставляет `created_by` = `sub` из токена. Токен проверяется по общему
  `JWT_SECRET` прямо в справочнике, а не заголовком от nginx: порт 4300 открыт мимо
  nginx, заголовок подделал бы кто угодно. `created_by` без FK, из тела не принимается.
  Остальные справочники пока пишутся без входа.
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

`code` типоразмера **нигде не хранится в данных** — он вычисляется
`buildVariantCode()` из `src/modules/catalog/variant-code.ts`, одной и той же функцией
для API и для сидов. Не вводите руками. `id` в сидах проставлены явно, потому что на
них ссылаются нормы расхода из чужой базы.

Вид параметра (длина, диаметр, напряжение) живёт на `param_values.kind_id`, а **не**
на связке типоразмера со значением: пока он был на связке, одно «8 мм» помечалось
`diameter` у одного материала и `length` у другого. Уникальность значений — по тройке
`(kind_id, value, unit_id)` с `NULLS NOT DISTINCT`, так что «100 мм длины» и
«100 мм ширины» это две законные строки, а два одинаковых значения — отказ.

Сиды (`src/db/seed.ts`) — именованные шаги, каждый в своей транзакции и с отметкой
в `seed_history`: контейнер гоняет `db:seed` при каждом старте, а том переживает
рестарт, так что без отметок вторая заливка падала бы на duplicate key. Правка уже
применённого шага до базы не доедет — справочник пока не в проде, поэтому данные
чинятся правкой сидов и пересозданием базы (`down -v`), а не досылкой.

### user-server: авторизация

Вход по `login` (хранится в нижнем регистре), обязательны `login`, `password`,
`firstName`, необязательна `lastName`; роль `USER | ADMIN`, при регистрации всегда `USER`.
Эндпоинты: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`,
`POST /auth/change-password`, `GET /users` (только `ADMIN`).

`AuthGuard` висит глобально (`APP_GUARD`): закрыто всё, что не помечено `@Public()`,
роли — `@Roles(Role.ADMIN)`, текущий пользователь — `@CurrentUser()`. Роль гвард берёт
из базы, а не из токена; в токене (`sub`, `login`, `role`) она для других сервисов.
Пользователь наружу отдаётся только через `toPublicUser()` — без хеша пароля.

### ionic-client

- **Роутинг**: локаль — часть URL (`/:locale/...`). Глобальный `beforeEach` в
  `src/router/index.ts` догружает словарь и подменяет неизвестный сегмент;
  `afterEach` собирает ключ вида `catalog/materials` или `main/facade/EIFS` из пути
  и достаёт по нему SEO-описание из `src/router/constants.ts`. Добавили роут,
  который должен индексироваться, — добавьте ключ туда и путь в `generate-sitemap.cjs`
  (он мирроро́к роутера, синхронизируется вручную).
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
- `drizzle-kit push --force` при старте dev-контейнера словаря **падает каждый раз**:
  он заново предлагает добавить уже существующий `param_values_kind_value_unit_uq`
  (`NULLS NOT DISTINCT`), спрашивает про truncate и без TTY валится, а `&&` дальше
  почему-то проходит — сиды и сервер стартуют на старой схеме. Новые колонки до базы
  сами не доезжают: `created_by` и `work_types` (+ `systems.work_type_id`) в dev
  накатаны руками SQL, отметка `work-types` в `seed_history` поставлена там же;
  так же — `name_ru`/`name_en`/`description_*` у `systems` и `name_*` у `work_stages`
  (старая колонка `systems.description` удалена), потом `name_ru` там же сделан
  необязательным и добавлены `CHECK systems_name_present` / `work_stages_name_present`.
- Версия Postgres в compose закреплена (`postgres:18-alpine`) намеренно: незакреплённый
  тег однажды принёс новый мажор, не читающий старый каталог данных.
