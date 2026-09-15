# Données de démo des captures

Les captures du Help Center se font **uniquement** sur cet univers fictif, chargé dans la
base dédiée `bacastages_docs`. Aucun établissement, élève ou adulte n'existe réellement ;
toutes les adresses sont en `@demo.bacastages.fr`, un domaine qui ne reçoit rien.

```bash
scripts/captures/seed-demo.sh           # nettoie puis recrée l'univers (idempotent)
scripts/captures/seed-demo.sh --clean   # nettoie seulement
```

- **Base** : `seed-demo.sh` dérive l'URL de celle du back (`bacastages` → `bacastages_docs`)
  sans l'afficher, et les deux scripts refusent toute autre base.
- **Modules** : `seed-demo.ts` vit hors du back ; il résout `@prisma/client`, `bcrypt` et
  `dayjs` depuis le worktree back (`BACK_DIR`, par défaut
  `~/dev/bacastages/.worktrees/docs-captures/back`, dépendances installées et client Prisma
  généré).
- **Marqueurs** : UAI commençant par `999000`, adresses `@demo.bacastages.fr`, identifiants
  techniques préfixés `d0c5a000-`. Seul ce qui les porte est supprimé.
- **Dates** : toutes calculées depuis le jour d'exécution (heure de Paris), en jours ouvrés,
  et gardées dans l'année scolaire en cours. **Relancer le script le jour même d'une séance
  de captures** : « aujourd'hui », « à venir » et les invitations à signer restent alors
  vrais. Début septembre, les mini-stages passés peuvent tomber dans l'année précédente ; le
  script le signale.

## Lancer le produit sur la démo

```bash
cd ~/dev/bacastages/.worktrees/docs-captures/back
BACK_PORT=8100 DATABASE_URL=<url bacastages_docs> \
EMAIL_REDIRECT_ALL_TO=delivered@resend.dev FRONTEND_URL=http://localhost:3100 \
SENTRY_ENABLED=false ELECTRONIC_SIGNATURE_PROVIDER=fake \
node_modules/.bin/ts-node -r tsconfig-paths/register src/server.ts
```

- `EMAIL_REDIRECT_ALL_TO` : tout e-mail part vers l'adresse de test Resend, qui ne délivre
  à personne.
- `ELECTRONIC_SIGNATURE_PROVIDER=fake` : **indispensable**. Les parcours de signature de la
  démo n'existent qu'en base ; sans le fournisseur factice, les tâches planifiées
  (réconciliation toutes les 30 min, relances à 9 h) interrogeraient le vrai Documenso sur
  des enveloppes fictives.
- Front du worktree sur le port 3100, en pointant l'API sur `http://localhost:8100/api`.
- Connexion par le formulaire, avec les comptes ci-dessous : la route `/api/dev/session`
  sert les comptes agent, pas ceux-ci.

## Comptes

Mot de passe commun : **`Demo-Bacastages-2026`**

| Compte | Rôle | Établissement | Arrive sur |
|---|---|---|---|
| `philippe.rousseau@demo.bacastages.fr` | `school_admin` — proviseur, signataire des conventions | Lycée professionnel du Val d'Arnon | `/announcements` |
| `karine.lemoine@demo.bacastages.fr` | `ddf` — DDFPT, valide conventions et comptes-rendus | Lycée professionnel du Val d'Arnon | `/myannouncements` |
| `julien.moreau@demo.bacastages.fr` | `professor` — lié à sa fiche professeur | Lycée professionnel du Val d'Arnon | `/prof-ministages` |
| `sandrine.vidal@demo.bacastages.fr` | `viewer` — vie scolaire | Lycée professionnel du Val d'Arnon | `/ministages` |
| `veronique.blanc@demo.bacastages.fr` | `college` — Compte Inscriptions | Collège Les Châtaigniers | `/announcements` |
| `frederic.noel@demo.bacastages.fr` | `school_admin` — principal, signataire côté origine | Collège Les Châtaigniers | `/announcements` |
| `celine.martin@demo.bacastages.fr` | `parent` — mère de Léa Martin (3e) | Collège Les Châtaigniers | `/announcements` |
| `yanis.haddad@demo.bacastages.fr` | `student` — élève majeur, signe lui-même | Lycée polyvalent des Coteaux | `/announcements` |
| `anne-sophie.perrin@demo.bacastages.fr` | `school_admin` — proviseure du second lycée d'accueil | Lycée polyvalent des Coteaux | `/announcements` |
| `stephanie.collet@demo.bacastages.fr` | `parent` — mère de Jeanne Collet | Collège Les Châtaigniers | `/announcements` |
| `support@demo.bacastages.fr` | `super_admin` | — (établissement courant : Val d'Arnon) | `/announcements` |
| `lucas.fabre@demo.bacastages.fr` | `professor` — **rattachement en attente** | Lycée professionnel du Val d'Arnon | `/school-approval-pending` |
| `mathieu.lambert@demo.bacastages.fr` | `viewer` — **demande le rôle professeur** | Lycée professionnel du Val d'Arnon | `/ministages` |

Tous les comptes ont leur e-mail confirmé et leur domaine validé : aucune fenêtre bloquante.

## L'univers

| Établissement | UAI | Rôle dans la démo |
|---|---|---|
| Lycée professionnel du Val d'Arnon (Arnay-la-Rivière) | `9990001A` | Lycée d'accueil principal, abonnement Bacastages Plus |
| Collège Les Châtaigniers (Arnay-la-Rivière) | `9990002B` | Collège d'origine, avec ses comptes |
| Collège de la Garenne (Villiers-le-Moutier) | `9990003C` | Second collège d'origine, sans compte |
| Lycée polyvalent des Coteaux (Bellerive-sur-Arnon) | `9990004D` | Second lycée d'accueil (parcours multi-établissements), autorisation annuelle de signature active |

Dates notées en jours ouvrés depuis le jour du seed : J-8 = huit jours ouvrés avant.

| Mini-stage | Date | Places | État | Ce qu'il montre |
|---|---|---|---|---|
| Maintenance des véhicules | J-8 | 5/6 | passé | présents, un absent, comptes-rendus à rédiger / à valider / validés |
| Maintenance des véhicules | J-2 | 4/4 | passé | comptes-rendus à rédiger |
| Maintenance des véhicules | aujourd'hui, 8 h 30–16 h 30 | 3/4 | du jour | appel en cours : une présence pointée, deux en attente |
| Maintenance des véhicules | J+7, deux jours | 6/8 | visible | une convention à chaque étape, un désinscrit |
| Maintenance des véhicules | J+9 | 3/3 | pleine | |
| Maintenance des véhicules | J+14 | 0/6 | annulée | |
| Maintenance des véhicules | J+21 | 0/6 | brouillon (non visible) | |
| Cuisine et restauration | J-6 | 4/5 | passé | filière à préinscription, comptes-rendus |
| Cuisine et restauration | J+10 | 2/5 | visible | préinscriptions à chaque étape, signatures électroniques |
| Accompagnement, soins et services à la personne | J+16, deux jours | 2/8 | visible | préinscriptions, signature en attente |
| Systèmes numériques | J+28 | 0/6 | brouillon | |
| Métiers du commerce et de la vente (Coteaux) | J-5 | 2/6 | passé | comptes-rendus d'un autre lycée |
| Métiers du commerce et de la vente (Coteaux) | J+12 | 2/6 | visible | signature à deux (autorisation annuelle) |

## Écran par écran

### Lycée d'accueil — `philippe.rousseau` (administrateur) et `karine.lemoine` (DDF)

**Mes offres** (`/myannouncements`)
- Visibles : Maintenance J+7, Cuisine J+10, ASSP J+16.
- Pleines : Maintenance J+9.
- Annulées : Maintenance J+14.
- Prêtes à publier : Maintenance J+21, Systèmes numériques J+28.
- Passées : J-8, J-6, J-2 et le mini-stage du jour (déjà commencé).

**Suivi** (`/suivi`, onglet chez nous) — les 34 élèves accueillis, à toutes les étapes :

| Étape | Élèves |
|---|---|
| Convention transmise, pas encore déposée | Chloé Dubois, Clara Rolland (ULIS), Alice Picard, Maëlle Giraud |
| Convention déposée, à valider | Enzo Roux, Camille Faure |
| Convention refusée (« signature du représentant légal manquante ») | Manon Lefèvre |
| Convention validée | Hugo Bernard |
| Convention signée hors plateforme | Inès Mercier, Paul Henry |
| Signature électronique en cours | Yanis Haddad (collège d'origine a signé), Jade Fournier, Nolan Fleury |
| Signature électronique terminée | Louis Robin, Mehdi Aubert |
| Désinscrit (visible avec « afficher désinscrits ») | Théo Garcia |
| Présents | élèves des mini-stages passés ; Noémie Laurent aujourd'hui |
| Absent | Adam Lopez (J-8) |

La cantine est suivie : Léa Martin et Nathan Colin ont une date de paiement.

**Préinscriptions** (`/preregistrations`)
- À traiter par le lycée (collège déjà d'accord) : Timéo Barbier et Anaïs Carré (Cuisine J+10), Ilyes Benoit (ASSP J+16).
- En attente du collège : Léa Martin (Cuisine), Jeanne Collet (ASSP).
- Refusées : Gabriel Roy (par le lycée), Léna Vasseur (par le collège), chacune avec son motif.
- Validées : les huit élèves inscrits en Cuisine et en ASSP.

**À signer** (`/signatures`) — trois conventions attendent la signature du proviseur :
- Yanis Haddad (Maintenance J+7) ;
- Jade Fournier (Cuisine J+10) ;
- Nolan Fleury (ASSP J+16).

Invitations envoyées la veille du seed. Visible avec `philippe.rousseau` seulement : la
file suit l'adresse du signataire, pas le rôle ; elle est vide pour la DDF.

**Comptes-rendus** (`/reports`, vue accueil, validation manuelle)
- À valider : Sarah Meyer (J-8, rédigé par Thomas Girard), Zoé Renaud (J-2), Lou Brunet (Cuisine J-6).
- Validés : Léa Martin (avec commentaire du professeur), Nathan Colin, Ethan Marchal, Sacha Lemaire (avec commentaire).
- À rédiger : Emma Blanchard (J-8), Maxime Gautier, Lina Chevallier, Tom Perrot (J-2), Rose Dumont (J-6).
- Les élèves des mini-stages à venir y figurent en « Non complété ».
- L'absent n'y figure pas.

**Calendrier** (`/calendar`) : le mini-stage du jour et celui de J-2 dans la semaine
courante (selon le jour), puis J+7, J+9, J+10, J+16…

**Statistiques** (`/stats`) : calculées en direct sur l'année scolaire en cours, avec
quatre filières, des places offertes et remplies, et deux collèges d'origine. Aucune
archive d'année précédente.

**Établissement** (`/school`)
- Informations et Présentation : chef d'établissement, contact, site, type, effectif,
  description, consignes d'accueil. Pas de photos.
- Paramètres :
  - signature électronique activée, signataire déclaré (Philippe Rousseau, proviseur) ;
  - signature en parallèle ;
  - comptes-rendus à valider, préinscription activée, e-mail des parents obligatoire,
    suivi de la cantine ;
  - pas d'autorisation annuelle sur ce lycée (voir les Coteaux).
- Convention : le modèle « Convention officielle Bacastages » affecté aux quatre filières.
  Pas de logo ni de signature scannée.
- Professeur(e)s : Julien Moreau (lié à un compte) ; Thomas Girard, Isabelle Petit, Amina
  Benali, Olivier Masson et Lucas Fabre (non liés).
- Filières :
  - Maintenance des véhicules : Bac Pro ×2, CAP ;
  - Cuisine et restauration : CAP, Bac Pro ; préinscription ;
  - Accompagnement, soins et services à la personne : préinscription ;
  - Systèmes numériques.

  Chaque filière a ses combinaisons diplôme × spécialité, sa couleur et ses professeurs.
- E-mail de rappel : texte personnalisé.
- Abonnement : Bacastages Plus, année en cours.

**Comptes et demandes** (`/school/accounts`)
- Les six comptes du lycée.
- Adhésion à approuver : Lucas Fabre, avec son motif.
- Demande de rôle : Mathieu Lambert, vie scolaire → professeur, avec son motif.

### Professeur — `julien.moreau`

- **Mes mini-stages** (`/prof-ministages`) :
  - passés : J-8, J-2 ;
  - du jour ;
  - à venir : J+7 ;
  - brouillon J+21, masqué tant que « afficher les vides » est décoché.
- Comptes-rendus à rédiger depuis les mini-stages passés : Emma Blanchard, Maxime Gautier,
  Lina Chevallier, Tom Perrot.
- **Calendrier** : ses seuls mini-stages.

### Vie scolaire — `sandrine.vidal`

**Mini-stages** (`/ministages`), **Suivi** (lecture seule) et **Calendrier** du lycée ; c'est
elle qui a pointé les présences.

### Collège — `veronique.blanc` (Compte Inscriptions) et `frederic.noel` (principal)

- **Suivi** (ailleurs) : les élèves du collège aux deux lycées, dont Léa Martin et Nathan
  Colin, passés par le Val d'Arnon et par les Coteaux.
- **Préinscriptions** : à traiter par le collège, Léa Martin (Cuisine) et Jeanne Collet
  (ASSP), déposées par les familles. Refusée par le collège : Léna Vasseur.
- **Comptes-rendus** (vue origine) : validés, avec les comptes-rendus des deux lycées.
- **À signer** (`frederic.noel`) :
  - Jade Fournier (Val d'Arnon, trois signataires) ;
  - Léa Martin (Coteaux, deux signataires grâce à l'autorisation annuelle).
- **Établissement** : Informations et Présentation du collège.

### Famille — `celine.martin`, `stephanie.collet`, `yanis.haddad`

- **`celine.martin`**, pour Léa :
  - **Suivi** : un mini-stage passé (Val d'Arnon), un à signer (Coteaux J+12), une
    préinscription en attente (Cuisine) ;
  - **Préinscriptions** : la demande en attente ;
  - **Comptes-rendus** : le compte-rendu validé et commenté ;
  - **À signer** : la convention de Léa aux Coteaux, en tant que responsable légale.
- **`stephanie.collet`** : la préinscription de Jeanne en attente du collège.
- **`yanis.haddad`**, élève majeur :
  - **Suivi** : son mini-stage Maintenance J+7 ;
  - **À signer** : sa propre convention (le collège d'origine a déjà signé, le proviseur
    pas encore).

### Second lycée — `anne-sophie.perrin`

- **Mes offres** : les deux mini-stages Commerce.
- **Suivi** :
  - chez nous : Nathan Colin, Rayan Morel, Léa Martin, Lucie Moulin ;
  - ailleurs : Yanis Haddad, son élève accueilli au Val d'Arnon.
- **Comptes-rendus** : un validé, un à rédiger.
- **Paramètres** : autorisation annuelle de signature **active** pour l'année en cours.

## Ce que la démo ne couvre pas

- **Fichiers.** Aucun fichier n'est déposé dans le stockage S3. Les conventions déposées,
  PDF signés et autorisation annuelle existent en base, mais leur téléchargement ou leur
  aperçu échoue. Pas de photos de présentation, de logo ni de signature scannée : ils
  exigent un envoi réel.
- **Signature électronique.** Les parcours sont écrits en base, sans enveloppe Documenso :
  - la file « À signer », les statuts et les signataires s'affichent ;
  - le bouton « Signer » (session embarquée) ne peut pas aboutir ;
  - les modèles Documenso ne sont pas provisionnés, l'écran de préparation de la
    signature peut donc les signaler manquants.

  Les invitations sont datées de la veille : au-delà de trois jours, la relance planifiée
  les viserait. Relancer le seed avant chaque séance.
- **Historique des conventions** (journal des actions) : vide. Seules les versions de
  fichier sont créées.
- **Statistiques archivées** des années passées, données CRM et facturation de
  `/platform-admin` : absentes.
