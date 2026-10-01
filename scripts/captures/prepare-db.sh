#!/usr/bin/env bash
#
# Prépare le **schéma** de la base de démo `bacastages_docs`. À lancer une fois par base,
# avant le premier `seed-demo.sh` — et de nouveau après un `prisma migrate` du back.
#
#   scripts/captures/prepare-db.sh
#
# Une base créée à la main ne reçoit que les migrations Prisma, et elles ne suffisent pas.
# Les fonctions SQL, les déclencheurs et les index du produit vivent dans
# `postgres/init/*.sql`, que Postgres n'exécute qu'à la **création de son tout premier
# rôle et de sa première base** : `bacastages_docs`, créée ensuite dans le même serveur,
# ne les a jamais vus.
#
# Ce qui manquait au 21/09/2026, et ce que ça donnait à l'écran : sans
# `public.search_schools`, la dernière étape de la création de compte — « Reliez votre
# établissement » — ne renvoyait aucun résultat. Le formulaire ne montre pas d'erreur :
# la liste reste simplement vide, et on croit à une base sans établissements. Manquaient
# aussi l'extension `pg_trgm`, `is_valid_uai`, les deux déclencheurs de capacité
# (`enforce_session_capacity`, `sync_allocated_places`) et treize index.
#
# L'ordre compte. `02-functions.sql` porte des `CREATE OR REPLACE` de fonctions qu'une
# migration redéfinit ensuite (`search_session_ids`, `suggest_search_terms`) : passé
# après `migrate deploy`, il les ramènerait à leur version d'avant, sans rien signaler.
# On applique donc l'init **puis** les migrations, comme pour une vraie base.

set -euo pipefail

BACK_DIR="${BACK_DIR:-$HOME/dev/bacastages/.worktrees/docs-captures/back}"
INIT_DIR="$BACK_DIR/postgres/init"

if [[ ! -d "$INIT_DIR" ]]; then
    echo "❌ $INIT_DIR introuvable : surcharger BACK_DIR." >&2
    exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$BACK_DIR/.env" | cut -d= -f2- | tr -d '"' \
        | sed -E 's#/bacastages(\?|$)#/bacastages_docs\1#')"
fi
export DATABASE_URL

read -r DB_NAME DB_HOST DB_USER <<<"$(node -e '
const u = new URL(process.env.DATABASE_URL);
process.stdout.write([decodeURIComponent(u.pathname.slice(1)), u.hostname, decodeURIComponent(u.username)].join(" "));
')"

if [[ "$DB_NAME" != "bacastages_docs" ]]; then
    echo "❌ Base visée « ${DB_NAME:-illisible} » : ce script n'écrit que dans « bacastages_docs ». Refus." >&2
    exit 1
fi

# `psql` n'est pas installé sur le VPS ; le serveur, lui, tourne dans un conteneur dont
# le nom est le premier segment de l'hôte (`bacastages-postgres-dev.orb.local`).
run_sql() {
    if command -v psql >/dev/null 2>&1; then
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q
    else
        docker exec -i "${DB_HOST%%.*}" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q
    fi
}

# `03-triggers.sql` n'est écrit que pour la création du conteneur : ses `CREATE TRIGGER`
# n'ont ni `OR REPLACE` ni `DROP` préalable, et un second passage échoue. On retire donc
# d'abord les déclencheurs que le fichier va recréer — leurs noms sont lus dans le
# fichier, pour que ce script reste juste s'il en gagne un.
drop_triggers() {
    local sql
    sql="$(sed -nE 's/^CREATE TRIGGER ([a-z_]+).*/\1/p;s/^ *(BEFORE|AFTER)[A-Z ]+ ON ([a-z_]+).*/\2/p' "$1" \
        | paste - - \
        | awk '{ printf "DROP TRIGGER IF EXISTS %s ON %s;\n", $1, $2 }')"
    [[ -n "$sql" ]] && printf '%s\n' "$sql" | run_sql
}

echo "→ init du produit (extensions, fonctions, déclencheurs, index)"
for file in "$INIT_DIR"/*.sql; do
    printf '  %s\n' "$(basename "$file")"
    grep -q '^CREATE TRIGGER' "$file" && drop_triggers "$file"
    run_sql <"$file"
done

echo "→ migrations Prisma"
(cd "$BACK_DIR" && pnpm exec prisma migrate deploy)

echo
echo "Base $DB_NAME prête. Charger les données : scripts/captures/seed-demo.sh"
