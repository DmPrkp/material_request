#!/bin/sh
# Выпуск и продление сертификата — сервис certbot в compose.prod.yaml.
# certonly --keep-until-expiring: первый прогон выпускает, дальше certbot идёт в
# Let's Encrypt, только когда до конца срока меньше 30 дней, — частый цикл лимитов не тратит.
# Проверка — webroot: файл кладётся в общий с nginx /var/www/certbot, nginx отдаёт его по
# http://<домен>/.well-known/acme-challenge/, поэтому порт 80 должен быть открыт наружу.
set -u
# sh — PID 1 контейнера, а PID 1 без обработчика SIGTERM игнорирует, и docker stop ждал бы SIGKILL.
trap 'exit 0' TERM INT

LIVE="/etc/letsencrypt/live/$SSL_DOMAIN"

while :; do
  # Папка live/<домен>, заведённая не certbot-ом (нет renewal/<домен>.conf), — мусор от
  # ручных самоподписанных. С ней certbot выпустит сертификат в <домен>-0001, мимо nginx.
  if [ -d "$LIVE" ] && [ ! -f "/etc/letsencrypt/renewal/$SSL_DOMAIN.conf" ]; then
    echo "Удаляю $LIVE: её завёл не certbot"
    rm -rf "$LIVE"
  fi

  if [ -n "${LETSENCRYPT_EMAIL:-}" ]; then
    set -- --email "$LETSENCRYPT_EMAIL"
  else
    set -- --register-unsafely-without-email
  fi

  certbot certonly --webroot -w /var/www/certbot \
    -d "$SSL_DOMAIN" --cert-name "$SSL_DOMAIN" \
    --keep-until-expiring --non-interactive --agree-tos --no-eff-email "$@" ||
    echo "certbot не справился — следующая попытка через 12 часов"

  # sleep в фоне и wait: пока идёт обычный sleep, trap не сработает до его конца.
  sleep 43200 &
  wait $!
done
