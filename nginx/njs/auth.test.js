/**
 * Тесты auth.js — тем же njs, что внутри nginx:
 *   docker run --rm -v "$PWD/nginx/njs:/njs" nginx:1.25.3 njs -p /njs /njs/auth.test.js
 *
 * Токены подписаны настоящим jsonwebtoken (тем, что в user-server), а не самим auth.js:
 * иначе тест сверял бы нашу HMAC сам с собой и не поймал бы ошибку в base64url.
 */
import auth from 'auth.js';

const SECRET = 'test-secret';
const NOW = 1789760000;
const FAR = 4102444800;

const tokens = {
  user: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJVU0VSIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3ODk3NTk2Nzl9.cp1nDg3kLPDN1UFXRZASy_uoaMoD6H_oYvvdl67axks',
  admin:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImxvZ2luIjoicm9vdCIsInJvbGUiOiJBRE1JTiIsImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzg5NzU5Njc5fQ.Y0CeW1iepYLuByBLG5vcd0p94lC1AqoonfU43yIM8zM',
  expired:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJVU0VSIiwiZXhwIjoxMDAwLCJpYXQiOjE3ODk3NTk2Nzl9.hnVApDgs_Cx56zd9Fwh7yp6dQiUivErvugoFlRYZMoA',
  notYet:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJVU0VSIiwibmJmIjo0MTAyNDQ0ODAwLCJleHAiOjQxMDI0NDQ4MTAsImlhdCI6MTc4OTc1OTY3OX0.yHilq1eCxXe-RCTklrriALyXXm7xBwjUekDs9X2CnW0',
  otherSecret:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJVU0VSIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3ODk3NTk2Nzl9.0NjAJkwsKy9urD0dMqbh-D9Qbl4KBgQNZdjRBijIqtc',
  hs512:
    'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJVU0VSIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3ODk3NTk2Nzl9.0a1JMBFBX81bo-0dkNKQdqimKceSiY2sjd_HgNye2X8tiOAo2EDQ5ywtlzvv7xu1-D3JKZvzfrjMlloLD2a7Wg',
  noSub:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6Iml2YW4iLCJyb2xlIjoiVVNFUiIsImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzg5NzU5Njc5fQ.55zxbefwDE8dM6MpqE6L_6K4lHrsnCgi7wjK9oX-e6U',
  stringSub:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwibG9naW4iOiJpdmFuIiwicm9sZSI6IlVTRVIiLCJleHAiOjQxMDI0NDQ4MDAsImlhdCI6MTc4OTc1OTY3OX0.JdTo8A1RrnhcE_kglPR8BoltAJLcHOyLAkYwODRBRLM',
  badRole:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsImxvZ2luIjoiaXZhbiIsInJvbGUiOiJST09UIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3ODk3NTk2Nzl9.f3MkI_yyZNi-YBFFujf2bonvuA7UUuls-zrcxlUXUOk',
  cyrillic:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjksImxvZ2luIjoi0LjQstCw0L0iLCJyb2xlIjoiVVNFUiIsImV4cCI6NDEwMjQ0NDgwMCwiaWF0IjoxNzg5NzU5Njc5fQ.lQ8Z8Leusf2O1IfFVxk3sIOpMHnm4Y62npZkCa6s-I4',
};

const encode = (part) => Buffer.from(JSON.stringify(part)).toString('base64url');
// Ни деструктуризации, ни for…of в njs 0.8 нет — отсюда индексы и forEach.
const userParts = tokens.user.split('.');
const userBody = userParts[1];
const userSignature = userParts[2];

const cases = [
  ['без заголовка — аноним', undefined, SECRET, { status: 'anonymous' }],
  ['токен user-server — пользователь', `Bearer ${tokens.user}`, SECRET, { status: 'ok', id: 7, role: 'USER' }],
  ['админ — с ролью', `Bearer ${tokens.admin}`, SECRET, { status: 'ok', id: 1, role: 'ADMIN' }],
  ['схема без учёта регистра', `bearer ${tokens.user}`, SECRET, { status: 'ok', id: 7, role: 'USER' }],
  ['кириллический логин не мешает', `Bearer ${tokens.cyrillic}`, SECRET, { status: 'ok', id: 9, role: 'USER' }],
  ['протух — битый', `Bearer ${tokens.expired}`, SECRET, { status: 'invalid' }],
  ['nbf в будущем — битый', `Bearer ${tokens.notYet}`, SECRET, { status: 'invalid' }],
  ['чужой секрет — битый', `Bearer ${tokens.otherSecret}`, SECRET, { status: 'invalid' }],
  ['HS512 — битый: алгоритм закреплён', `Bearer ${tokens.hs512}`, SECRET, { status: 'invalid' }],
  [
    'alg: none — битый',
    `Bearer ${encode({ alg: 'none', typ: 'JWT' })}.${userBody}.`,
    SECRET,
    { status: 'invalid' },
  ],
  [
    'подменённый payload с прежней подписью — битый',
    `Bearer ${userParts[0]}.${encode({ sub: 1, role: 'ADMIN', exp: FAR })}.${userSignature}`,
    SECRET,
    { status: 'invalid' },
  ],
  ['без sub — битый', `Bearer ${tokens.noSub}`, SECRET, { status: 'invalid' }],
  ['sub строкой — битый', `Bearer ${tokens.stringSub}`, SECRET, { status: 'invalid' }],
  ['незнакомая роль — битая', `Bearer ${tokens.badRole}`, SECRET, { status: 'invalid' }],
  ['не Bearer — битый', `Basic ${tokens.user}`, SECRET, { status: 'invalid' }],
  ['мусор вместо токена — битый', 'Bearer abc', SECRET, { status: 'invalid' }],
  ['мусор в частях — битый', 'Bearer a.b.c', SECRET, { status: 'invalid' }],
  ['пустой Bearer — битый', 'Bearer ', SECRET, { status: 'invalid' }],
  ['без секрета с токеном — 503, а не аноним', `Bearer ${tokens.user}`, undefined, { status: 'unconfigured' }],
  ['без секрета и без токена — аноним', undefined, undefined, { status: 'anonymous' }],
];

let failed = 0;
cases.forEach(function (c) {
  const name = c[0];
  const expected = c[3];
  const actual = JSON.stringify(auth.check(c[1], c[2], NOW));
  if (actual === JSON.stringify(expected)) {
    console.log(`ok   ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name}: ждали ${JSON.stringify(expected)}, получили ${actual}`);
  }
});

console.log(`${cases.length - failed}/${cases.length}`);
if (failed) throw new Error(`упало тестов: ${failed}`);
