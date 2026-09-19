#!/bin/bash
# Официальный образ postgres создаёт только базу из POSTGRES_DB.
# Остальные сервисы держат свои базы в том же инстансе — заводим их здесь.
set -euo pipefail

for db in order user dictionary warehouse company; do
  echo "создаю базу $db"
  # --dbname обязателен: без него psql идёт в базу с именем пользователя, которой нет
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    SELECT 'CREATE DATABASE "$db"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
SQL
done
