#!/usr/bin/env node
/**
 * Скриншоты сценариев для главной (/:locale/main): node scripts/screenshots/landing.mjs --help
 *
 * Снимаем настоящий интерфейс на поднятом стеке, а не рисуем макеты: после правки
 * вёрстки скриншоты пересоздаются одной командой и не врут. Браузер — установленный
 * Chrome через playwright-core: полный playwright тянет свой Chromium на ~150 МБ.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright-core';
import sharp from 'sharp';

import { SCENARIOS } from './scenarios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT = path.join(ROOT, 'ionic-client');

const HELP = `
Скриншоты сценариев главной (стек должен быть поднят, демо-данные — scripts/seed).

  cd scripts/screenshots && npm install && node landing.mjs [опции]

  --only a,b        только эти сценарии: ${SCENARIOS.map((s) => s.id).join(', ')}
  --locales ru,en   языки
  --themes light,dark
  --login demo01    под кем снимать: без входа в шапке висит «!» неавторизованного
  --password demo123
  --base URL        адрес nginx (по умолчанию http://localhost)
  --out DIR         куда класть (по умолчанию ionic-client/public/landing)
  --headed          показать браузер — отлаживать шаги
  --allow-remote    разрешить не-локальный адрес

Каждый прогон проходит расчёт по-настоящему и заводит заявку у --login.
`;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// Телефон, под который вёрстка и делается (mobile first). Android, а не iPhone:
// на iOS-агенте Ionic переключается в режим ios, и скриншот не совпал бы с тем,
// что видит большинство пользователей.
const VIEWPORT = { width: 390, height: 844 };
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
// На главной экран телефона ~240px в ширину: 2× для плотных экранов, больше — лишний вес.
const OUT_WIDTH = 480;

function parseOptions() {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      only: { type: 'string' },
      locales: { type: 'string', default: 'ru,en' },
      themes: { type: 'string', default: 'light,dark' },
      login: { type: 'string', default: 'demo01' },
      password: { type: 'string', default: 'demo123' },
      base: { type: 'string', default: 'http://localhost' },
      out: { type: 'string', default: path.join(CLIENT, 'public/landing') },
      headed: { type: 'boolean', default: false },
      'allow-remote': { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const only = values.only ? list(values.only) : null;
  const unknown = only?.filter((id) => !SCENARIOS.some((s) => s.id === id)) ?? [];
  if (unknown.length) throw new Error(`Нет сценариев: ${unknown.join(', ')}`);
  if (!values['allow-remote'] && !LOCAL_HOSTS.has(new URL(values.base).hostname)) {
    throw new Error(`${values.base} — не локальный адрес; нужен --allow-remote`);
  }
  return {
    ...values,
    locales: list(values.locales),
    themes: list(values.themes),
    scenarios: only ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS,
  };
}

async function login(base, loginName, password) {
  const res = await fetch(new URL('/user/api/v1/auth/login', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!res.ok) {
    throw new Error(`Вход ${loginName}: ${res.status}. Демо-пользователи — node scripts/seed/seed.mjs`);
  }
  return (await res.json()).accessToken;
}

async function loadMessages(locale) {
  return JSON.parse(await readFile(path.join(CLIENT, `src/plugins/i18n/locales/${locale}.json`), 'utf8'));
}

async function main() {
  const opts = parseOptions();
  const token = await login(opts.base, opts.login, opts.password);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !opts.headed,
    // Полоса прокрутки десктопного Chrome на «телефоне» выдаёт подделку.
    args: ['--hide-scrollbars'],
  });

  try {
    for (const locale of opts.locales) {
      const messages = await loadMessages(locale);
      for (const theme of opts.themes) {
        const context = await browser.newContext({
          viewport: VIEWPORT,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          userAgent: USER_AGENT,
          locale,
          colorScheme: theme,
        });
        // Токен и язык клиент поднимает из localStorage до монтирования, тему — из куки.
        await context.addInitScript(
          ([t, l]) => {
            localStorage.setItem('mr-auth-token', t);
            localStorage.setItem('user-locale', l);
          },
          [token, locale]
        );
        await context.addCookies([{ name: 'theme_mode', value: theme, url: opts.base }]);
        const page = await context.newPage();

        for (const scenario of opts.scenarios) {
          const dir = path.join(opts.out, scenario.id);
          await mkdir(dir, { recursive: true });
          const ctx = {
            page,
            locale,
            t: (key) => key.split('.').reduce((o, k) => o?.[k], messages),
            go: (p) => page.goto(new URL(`/${locale}${p}`, opts.base).href),
          };
          for (const [i, step] of scenario.steps.entries()) {
            await step(ctx);
            const file = path.join(dir, `${i + 1}-${locale}-${theme}.webp`);
            await writeFile(file, await shoot(page));
            console.log(path.relative(ROOT, file));
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function shoot(page) {
  // Ionic анимирует смену страниц, а данные приходят после первой отрисовки.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const png = await page.screenshot({ animations: 'disabled', caret: 'hide' });
  return sharp(png).resize({ width: OUT_WIDTH }).webp({ quality: 80 }).toBuffer();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
