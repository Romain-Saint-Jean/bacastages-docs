#!/usr/bin/env bash
#
# Démarre ou arrête l'environnement de captures : back et front de la refonte, sur la
# base de démo.
#
#   scripts/captures/env.sh start     # lance back (8100) et front (3100), attend qu'ils répondent
#   scripts/captures/env.sh stop      # arrête ce que `start` a lancé, et rien d'autre
#   scripts/captures/env.sh status
#
# Les ports 3000 et 8000 sont ceux des autres sessions de travail : on ne s'y branche pas.
# Le front de la refonte retombe sur `localhost:8000` quand rien ne le dit : ses deux
# chemins d'appel se pilotent par variable, et il faut les poser tous les deux.
# `NEXT_PUBLIC_API_URL` vise les appels rendus côté serveur, `DEV_API_ORIGIN` la
# réécriture `/api-proxy` qui sert les appels du navigateur. En oublier un est
# silencieux : l'écran répond, mais avec les données du back voisin.
#
# Les .env des worktrees sont des liens vers le dépôt principal : on ne les modifie pas,
# on surcharge les variables au lancement (dotenv n'écrase pas une variable définie).

set -euo pipefail

WORKTREES="${WORKTREES:-/home/romain/dev/bacastages/.worktrees/docs-captures}"
BACK="$WORKTREES/back"
FRONT="$WORKTREES/front"
BACK_PORT=8100
FRONT_PORT=3100
STATE="${XDG_RUNTIME_DIR:-/tmp}/bacastages-captures"
mkdir -p "$STATE"

docs_database_url() {
  local url
  url="$(grep -E '^DATABASE_URL=' "$BACK/.env" | cut -d= -f2- | tr -d '"' | sed -E 's#/bacastages(\?|$)#/bacastages_docs\1#')"
  case "$url" in */bacastages_docs*) printf '%s' "$url" ;; *) echo "base de démo introuvable" >&2; exit 1 ;; esac
}

wait_for() {
  local url="$1" name="$2"
  for _ in $(seq 1 120); do
    curl -s -o /dev/null "$url" && { echo "  $name prêt : $url"; return; }
    sleep 2
  done
  echo "  $name ne répond pas, voir $STATE/$name.log" >&2
  exit 1
}

start() {
  for port in $BACK_PORT $FRONT_PORT; do
    if ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then
      echo "le port $port est déjà pris : env.sh stop, ou libérer le port" >&2
      exit 1
    fi
  done

  echo "→ back sur $BACK_PORT"
  (
    cd "$BACK"
    # Signature électronique factice : sinon les tâches planifiées appelleraient
    # Documenso sur les enveloppes fictives de la démo.
    DATABASE_URL="$(docs_database_url)" \
    BACK_PORT=$BACK_PORT \
    FRONTEND_URL="http://localhost:$FRONT_PORT" \
    EMAIL_REDIRECT_ALL_TO=delivered@resend.dev \
    ELECTRONIC_SIGNATURE_PROVIDER=fake \
    SENTRY_ENABLED=false \
      setsid pnpm exec ts-node -r tsconfig-paths/register src/server.ts >"$STATE/back.log" 2>&1 &
    echo $! >"$STATE/back.pid"
  )

  echo "→ front sur $FRONT_PORT"
  (
    cd "$FRONT"
    # Pas d'Intercom sur les captures : le widget masquerait l'écran.
    PORT=$FRONT_PORT \
    NEXT_PUBLIC_API_URL="http://localhost:$BACK_PORT/api" \
    DEV_API_ORIGIN="http://localhost:$BACK_PORT" \
    NEXT_PUBLIC_SITE_URL="http://localhost:$FRONT_PORT" \
    NEXT_PUBLIC_INTERCOM_APP_ID= \
      setsid pnpm exec next dev -p $FRONT_PORT >"$STATE/front.log" 2>&1 &
    echo $! >"$STATE/front.pid"
  )

  wait_for "http://localhost:$BACK_PORT/health" back
  wait_for "http://localhost:$FRONT_PORT/" front
}

stop() {
  for name in front back; do
    local pidfile="$STATE/$name.pid"
    [[ -f "$pidfile" ]] || continue
    # setsid a fait du processus un chef de groupe : on arrête tout le groupe
    # (pnpm, ts-node ou next, et leurs enfants), et seulement lui.
    kill -- "-$(cat "$pidfile")" 2>/dev/null && echo "→ $name arrêté" || echo "→ $name déjà arrêté"
    rm -f "$pidfile"
  done
}

status() {
  for name in back front; do
    local pidfile="$STATE/$name.pid"
    if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo "$name : en marche (pid $(cat "$pidfile"))"
    else
      echo "$name : arrêté"
    fi
  done
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) sed -n '3,8p' "$0"; exit 1 ;;
esac
