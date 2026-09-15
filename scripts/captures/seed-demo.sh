#!/usr/bin/env bash
#
# Charge les données de démo des captures dans la base `bacastages_docs`.
#
#   scripts/captures/seed-demo.sh           # nettoie puis recrée l'univers de démo
#   scripts/captures/seed-demo.sh --clean   # nettoie seulement
#
# Le script TypeScript vit hors du dépôt back : ses modules (@prisma/client, bcrypt,
# dayjs) sont résolus depuis le worktree back, désigné par BACK_DIR.
#
# DATABASE_URL : si elle n'est pas fournie, elle est dérivée de celle du back en
# remplaçant la base `bacastages` par `bacastages_docs`. Dans tous les cas, le script
# refuse de s'exécuter si la base visée n'est pas exactement `bacastages_docs`.
# L'URL n'est jamais affichée.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="${BACK_DIR:-$HOME/dev/bacastages/.worktrees/docs-captures/back}"

if [[ ! -f "$BACK_DIR/package.json" || ! -d "$BACK_DIR/node_modules/@prisma/client" ]]; then
    echo "❌ Worktree back introuvable ou sans dépendances : $BACK_DIR (surcharger avec BACK_DIR=…)." >&2
    exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    if [[ ! -f "$BACK_DIR/.env" ]]; then
        echo "❌ $BACK_DIR/.env absent : fournir DATABASE_URL." >&2
        exit 1
    fi
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$BACK_DIR/.env" | cut -d= -f2- | tr -d '"' \
        | sed -E 's#/bacastages(\?|$)#/bacastages_docs\1#')"
fi
export DATABASE_URL BACK_DIR

DB_NAME="$(node -e 'try { process.stdout.write(decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1))) } catch { process.stdout.write("") }')"
if [[ "$DB_NAME" != "bacastages_docs" ]]; then
    echo "❌ Base visée « ${DB_NAME:-illisible} » : ce script n'écrit que dans « bacastages_docs ». Refus." >&2
    exit 1
fi

cd "$BACK_DIR"
exec "$BACK_DIR/node_modules/.bin/tsx" "$SCRIPT_DIR/seed-demo.ts" "$@"
