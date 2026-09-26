/**
 * Лог ошибок в файл на хосте — рядом с логами nginx, чтобы смотреть одной командой:
 *
 *   ssh deployer@… 'tail -n 50 /mnt/tank/matli/material_request/logs/order-server.log'
 *
 * Зачем, если ошибки и так уходят в stderr: stderr контейнера достаётся только через
 * `sudo docker compose logs <сервис>` — нужен root на сервере и надо заранее знать, в каком
 * из шести сервисов смотреть. Так лёг прод 26.09.2026: `relation "zayavki" does not exist`
 * со стеком лежал в docker logs, но искали его не там. Файл на смонтированном томе
 * переживает пересоздание контейнера и доступен обычным tail/grep.
 *
 * Пишем только то, что уже некуда деградировать: 5xx, падение миграций, необработанные
 * исключения. 4xx — это нормальная работа (не туда сходил клиент), в файле они бы утопили
 * настоящие поломки.
 *
 * LOG_DIR не задан — пишем только в stderr: так ведут себя тесты и локальный запуск без compose.
 */
import { appendFileSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/** Больше — переименовываем в .1 и начинаем заново; старых держим один. */
const MAX_BYTES = 5 * 1024 * 1024;

const SERVICE = 'order-server';

let target: string | undefined;
let ready = false;

function logFile(): string | undefined {
  if (ready) return target;
  ready = true;

  const dir = process.env.LOG_DIR;
  if (!dir) return undefined;

  try {
    mkdirSync(dir, { recursive: true });
    target = join(dir, `${SERVICE}.log`);
  } catch (error) {
    // Каталог смонтирован root-ом, а контейнер бежит под node — не повод падать: stderr остаётся.
    console.error(`! лог ошибок недоступен (${dir}):`, (error as Error).message);
  }
  return target;
}

/**
 * Ротация до записи, а не после: файл может перевалить порог одной большой записью со стеком,
 * и проверка после дала бы лишний оборот на каждой такой.
 */
function rotate(file: string): void {
  try {
    if (statSync(file).size < MAX_BYTES) return;
  } catch {
    return; // файла ещё нет — ротировать нечего
  }

  const previous = `${file}.1`;
  try {
    unlinkSync(previous);
  } catch {
    // .1 может не существовать — это первая ротация
  }
  renameSync(file, previous);
}

/**
 * Одна ошибка — заголовок в одну строку плюс стек с отступом. Отступ не случаен: он
 * отделяет записи без разделителей, поэтому `grep -v '^ '` показывает только заголовки,
 * а `grep -A 20 <текст>` — запись со стеком. Отсюда же ISO-время: сортируется как текст.
 */
export function logError(context: string, error: unknown): void {
  const at = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const head = `${at} ERROR ${SERVICE} ${context} ${message}`;
  // Первая строка стека дублирует message — её и отрезаем, отступ ставим остальным.
  const body = stack
    ? stack
        .split('\n')
        .slice(1)
        .map((line) => `    ${line.trim()}`)
        .join('\n')
    : undefined;

  console.error(head + (body ? `\n${body}` : ''));

  const file = logFile();
  if (!file) return;

  try {
    rotate(file);
    appendFileSync(file, `${head}\n${body ? `${body}\n` : ''}`);
  } catch (writeError) {
    // Логирование не имеет права ронять запрос: в stderr запись уже ушла.
    console.error('! не удалось записать в лог ошибок:', (writeError as Error).message);
  }
}
