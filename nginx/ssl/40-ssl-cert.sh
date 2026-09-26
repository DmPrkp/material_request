#!/bin/sh
# Какой сертификат отдаёт nginx. nginx.conf смотрит в /etc/nginx/ssl — это симлинк:
# на сертификат Let's Encrypt, если certbot его уже выпустил, иначе на самоподписанный.
# Без него nginx не стартует вовсе, а certbot не получит первый сертификат, пока nginx
# не отдаёт /.well-known/acme-challenge/ — курица и яйцо.
#
# Самоподписанный лежит отдельно, не в live/<домен>: папку, заведённую не им, certbot
# не трогает и кладёт настоящий сертификат в live/<домен>-0001, мимо nginx.
#
# Запускается штатным /docker-entrypoint.sh образа до старта nginx.
set -eu

LE="/etc/letsencrypt/live/$SSL_DOMAIN"
SELF=/etc/nginx/ssl-selfsigned
LINK=/etc/nginx/ssl

if [ ! -f "$SELF/fullchain.pem" ]; then
  mkdir -p "$SELF"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -subj "/CN=$SSL_DOMAIN" \
    -keyout "$SELF/privkey.pem" -out "$SELF/fullchain.pem" 2>/dev/null
fi

pick() {
  if [ -f "$LE/fullchain.pem" ] && [ -f "$LE/privkey.pem" ]; then echo "$LE"; else echo "$SELF"; fi
}

ln -sfn "$(pick)" "$LINK"
echo "$0: сертификат из $(readlink "$LINK")"

# certbot живёт в своём контейнере и reload-а nginx сделать не может. Поэтому nginx сам
# раз в 5 минут смотрит, куда ведёт live/<домен>/fullchain.pem (при продлении это новый
# файл в archive/), и перечитывает конфиг, только если сертификат сменился.
(
  last=$(readlink -f "$LINK/fullchain.pem")
  while :; do
    sleep "${SSL_RECHECK_SECONDS:-300}"
    ln -sfn "$(pick)" "$LINK"
    now=$(readlink -f "$LINK/fullchain.pem")
    if [ "$now" != "$last" ]; then
      echo "$0: новый сертификат $now — reload"
      nginx -s reload && last=$now
    fi
  done
) &
