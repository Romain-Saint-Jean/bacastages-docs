# Bacastages — documentation d'aide

La source des articles du Help Center Intercom. Les articles s'écrivent ici, en Markdown,
puis sont poussés vers Intercom, où Fin s'en sert pour répondre aux utilisateurs.

## Arborescence

| Chemin | Contenu |
|---|---|
| `articles/<collection>/<slug>.md` | Un article, métadonnées en en-tête |
| `assets/<collection>/<slug>/` | Ses captures d'écran |
| `collections.yml` | L'arborescence des collections |
| `scripts/` | Export depuis Intercom, conversion en Markdown, analyse, captures |

Les états des lieux (articles face au produit, questions du support) décrivent les
faiblesses du produit : ils vivent dans le dépôt privé `bacastages-roadmap`, sous
`audits/`.

L'en-tête garde l'identifiant de l'article dans Intercom (`intercom_us_id`). Une mise à
jour modifie cet article plutôt que d'en créer un nouveau : son URL reste valide, et elle
est déjà citée dans des e-mails envoyés aux utilisateurs.

## Ce qui n'entre jamais dans ce dépôt

- **Les conversations.** Elles contiennent des données personnelles, dont celles de
  mineurs. Elles vivent dans `~/.local/share/bacastages/intercom-<région>/`, en droits
  700. Leurs synthèses anonymisées vont dans `bacastages-roadmap/audits/`, qui est privé.
- **Les captures sur des données réelles.** Elles se produisent uniquement sur les
  données de démo (`scripts/captures/`).
- **Les tokens.** Ils se lisent depuis `~/.config/bacastages/intercom-<région>.env`, en
  droits 600, et passent aux scripts par la variable `INTERCOM_TOKEN`.

## Dépôt public

Tout ce qui est commité ici est lisible par tous, pour toujours. Un hook refuse les
commits qui contiennent un token, une clé, une adresse e-mail hors des domaines de
Bacastages et de démo, un numéro de téléphone ou un identifiant de conversation. À
activer une fois par clone :

```bash
git config core.hooksPath .githooks
```

## Export depuis un espace Intercom

```bash
set -a; . ~/.config/bacastages/intercom-us.env; set +a
export INTERCOM_TOKEN="$INTERCOM_US_TOKEN"
python3 scripts/intercom_export.py help-center ~/.local/share/bacastages/intercom-us/help-center
python3 scripts/intercom_export.py conversations ~/.local/share/bacastages/intercom-us
python3 scripts/import_articles.py ~/.local/share/bacastages/intercom-us/help-center intercom_us
```

Les URL d'images renvoyées par Intercom sont signées et expirent en une trentaine
d'heures : la conversion doit suivre l'export de près.

## Captures d'écran

Produites par Playwright sur les données de démo, jamais à la main : une capture se
régénère d'une commande quand l'interface change.

```bash
scripts/captures/seed-demo.sh      # le jour même : « aujourd'hui » et « à venir » restent vrais
scripts/captures/env.sh start      # back sur 8100, front sur 3100
node scripts/captures/scenarios/<collection>/<article>.mjs
scripts/captures/env.sh stop
```

Un scénario par article, qui écrit ses images dans `assets/<collection>/<article>/`.
`scripts/captures/lib.mjs` porte la connexion par rôle, le masquage des outils de
développement, l'encadré orange et le recadrage.

Prérequis :

- les worktrees `docs-captures` (`bacastages-roadmap/scripts/worktree.sh docs-captures both`) ;
- la base `bacastages_docs`, migrée et seedée (`scripts/captures/README.md`) ;
- deux modifications locales, non commitées, du front de ce worktree : l'API visée en dur
  passe de `localhost:8000` à `localhost:8100` (`next.config.mjs`,
  `src/utils/makeApiRequest.ts`), et `devIndicators: false` dans `next.config.mjs`.

## Captures de l'espace US

Toutes les captures importées de l'espace US montrent des écrans que la refonte a changés
(`audit/articles-vs-refonte.md`). Elles ne sont pas versionnées : elles sont archivées dans
`~/.local/share/bacastages/intercom-us/captures/`, et chaque article garde à leur place un
commentaire `<!-- Capture de l'espace US à refaire : … -->`. Les nouvelles captures
rejoignent `assets/`.
