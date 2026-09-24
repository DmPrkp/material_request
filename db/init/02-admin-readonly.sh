#!/bin/bash
# Read-only роль для admin-server: он читает все шесть баз напрямую, а пишет только через
# API сервисов. SELECT и ничего больше — кнопка в админке не сможет испортить данные мимо
# правил сервисов, даже если её там кто-то заведёт.
#
# Официальный образ гоняет это при первой инициализации тома. Скрипт повторяемый, так что
# на живом томе его можно запустить руками, не пересоздавая базы:
#   docker compose -f compose.dev.yaml -p matli-dev exec db bash /docker-entrypoint-initdb.d/02-admin-readonly.sh
# На проде — то же с compose.prod.yaml вместо compose.dev.yaml и без -p.
set -euo pipefail

# Без exit: неисполняемый .sh образ не запускает, а подключает через source, и exit
# оборвал бы всю инициализацию тома.
if [[ -z "${ADMIN_DB_USER:-}" || -z "${ADMIN_DB_PASSWORD:-}" ]]; then
  echo "ADMIN_DB_USER/ADMIN_DB_PASSWORD не заданы — read-only роль для админки не завожу"
# Админка под владельцем баз — выбор человека, но роль тогда трогать нельзя: ALTER ROLE ниже
# снял бы с него суперпользователя и сменил пароль, и все сервисы потеряли бы базу.
elif [[ "$ADMIN_DB_USER" == "${POSTGRES_USER:-}" ]]; then
  echo "ADMIN_DB_USER совпадает с POSTGRES_USER ($POSTGRES_USER) — админка читает под владельцем, роль не трогаю"
else
OWNER="${POSTGRES_USER:?}"
psql_in() { psql -v ON_ERROR_STOP=1 --username "$OWNER" --dbname "$1" -v role="$ADMIN_DB_USER" -v password="$ADMIN_DB_PASSWORD" -v owner="$OWNER"; }

echo "завожу read-only роль $ADMIN_DB_USER"
# Пароль обновляется и у существующей роли: сменили в секрете — перезапуск скрипта догонит.
psql_in "${POSTGRES_DB:-calc}" <<-'SQL'
  SELECT format('CREATE ROLE %I LOGIN', :'role')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'role')\gexec
  SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'role', :'password')\gexec
SQL

for db in calc order user dictionary warehouse company; do
  echo "  права на $db"
  # Схемы, кроме public, есть не везде (drizzle — журнал миграций), поэтому циклом по
  # тому, что уже есть. Таблицы, которые миграции заведут потом, догонят DEFAULT PRIVILEGES:
  # без IN SCHEMA они действуют на любую схему, в том числе ещё не созданную.
  psql_in "$db" <<-'SQL'
    SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'role')\gexec
    SELECT format('GRANT USAGE ON SCHEMA %I TO %I', nspname, :'role'),
           format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO %I', nspname, :'role')
    FROM pg_namespace
    WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema'\gexec
    SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I GRANT SELECT ON TABLES TO %I', :'owner', :'role')\gexec
    SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I GRANT USAGE ON SCHEMAS TO %I', :'owner', :'role')\gexec
SQL
done
fi
