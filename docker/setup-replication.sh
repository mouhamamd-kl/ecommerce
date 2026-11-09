#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 -v replication_password="$REPLICATION_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE ecommerce_replica WITH REPLICATION LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecommerce_replica') \gexec
SELECT format('ALTER ROLE ecommerce_replica WITH REPLICATION LOGIN PASSWORD %L', :'replication_password') \gexec
SQL

rule='host replication ecommerce_replica samenet scram-sha-256'
if ! grep -Fqx "$rule" /primary/pg_hba.conf; then
  printf '\n%s\n' "$rule" >> /primary/pg_hba.conf
fi
psql -v ON_ERROR_STOP=1 -c 'SELECT pg_reload_conf();'
echo 'Replication role and authenticated same-network access are ready.'
