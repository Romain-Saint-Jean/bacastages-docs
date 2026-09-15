#!/usr/bin/env bash
#
# Refuse un commit qui publierait un secret ou une donnée personnelle.
#
#   scripts/check-public.sh          # fichiers indexés (hook pre-commit)
#   scripts/check-public.sh --all    # tous les fichiers suivis
#
# Ce dépôt est public : une erreur y reste lisible pour toujours dans l'historique.
# Les captures ne sont pas inspectables ici, d'où la règle de ne les produire que sur
# les données de démo.

set -euo pipefail

# Domaines e-mail admis : ceux de Bacastages, les adresses de test, et les domaines
# fictifs des données de démo.
ALLOWED_EMAIL_DOMAINS='bacastages\.fr|notif\.bacastages\.fr|resend\.dev|example\.(com|org|fr)|[a-z0-9-]*demo[a-z0-9.-]*'
# Numéro d'exemple du formulaire d'inscription.
ALLOWED_PHONES='0612345678'

if [[ "${1:-}" == "--all" ]]; then
  mapfile -t files < <(git ls-files)
  show() { cat "$1"; }
else
  mapfile -t files < <(git diff --cached --name-only --diff-filter=ACMR)
  show() { git show ":$1"; }
fi

failures=0
report() { echo "✗ $1 : $2" >&2; failures=$((failures + 1)); }

for file in "${files[@]}"; do
  case "$file" in *.png|*.jpg|*.jpeg|*.gif|*.webp) continue ;; esac
  content="$(show "$file")"

  # Tokens et clés : Intercom (base64 de « tok: »), Resend, AWS, clés privées.
  grep -qE 'dG9rOj[A-Za-z0-9+/=_-]{20,}|re_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY' <<<"$content" \
    && report "$file" "ressemble à un token ou une clé"

  emails="$(grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' <<<"$content" \
    | grep -viE "@(${ALLOWED_EMAIL_DOMAINS})$" | sort -u || true)"
  [[ -n "$emails" ]] && report "$file" "adresse e-mail hors domaines admis : $(tr '\n' ' ' <<<"$emails")"

  phones="$(grep -oE '(\+33 ?|\b0)[1-9]([ .-]?[0-9]{2}){4}\b' <<<"$content" \
    | tr -d ' .-' | grep -vxE "$ALLOWED_PHONES" | sort -u || true)"
  [[ -n "$phones" ]] && report "$file" "numéro de téléphone"

  # Identifiants de conversation Intercom : ils renvoient à des échanges privés.
  grep -qE '\b2154[0-9]{11}\b' <<<"$content" && report "$file" "identifiant de conversation Intercom"
done

if (( failures > 0 )); then
  echo "Commit refusé : ce dépôt est public." >&2
  exit 1
fi
