#!/bin/sh
# Runs the Supabase CLI inside a container.
#
# The CLI starts the Supabase containers through the host Docker daemon and then
# connects to them on 127.0.0.1:<port>. Inside this container that address is not
# the host, so each local Supabase port is forwarded to host.docker.internal.
# The ports are read from supabase/config.toml (the working directory is the
# project), so changing them there needs no image rebuild.
set -e

ports=$(sed -nE 's/^port = ([0-9]+)$/\1/p' supabase/config.toml)
if [ -z "$ports" ]; then
  echo "supabase-cli: no ports found in supabase/config.toml" >&2
  exit 1
fi

for port in $ports; do
  socat "TCP-LISTEN:${port},bind=127.0.0.1,fork,reuseaddr" "TCP:host.docker.internal:${port}" &
done

exec pnpm exec supabase "$@"
