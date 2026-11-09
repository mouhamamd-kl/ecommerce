#!/bin/sh
set -eu

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  echo 'Creating the initial replica base backup...'
  gosu postgres pg_basebackup \
    --dbname="host=postgres port=5432 user=ecommerce_replica password=$REPLICATION_PASSWORD application_name=ecommerce_replica" \
    -D "$PGDATA" -Fp -Xs -R
elif [ ! -f "$PGDATA/standby.signal" ]; then
  echo 'Refusing to start: this volume is not a PostgreSQL standby.' >&2
  exit 1
fi

exec docker-entrypoint.sh postgres -c hot_standby=on -c shared_preload_libraries=pg_stat_statements
