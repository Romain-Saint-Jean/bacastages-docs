// Captures de articles/parents-familles/suivre-les-pre-inscriptions-de-son-enfant.md
//
// L'écart le plus large du lot : l'article envoyait le lecteur vers une rubrique
// « Préinscriptions » qui n'existe plus. `/preregistrations` et `/ministages` ont été
// fusionnées dans « Suivi » (refonte §4.3) ; leurs listes rendent une redirection 308 vers
// `/suivi` (`next.config.mjs`) et aucune des trois navigations ne les déclare
// (`navItems.ts`). Seules les fiches `/preregistrations/:type/:id` restent servies, pour
// les liens des e-mails déjà partis.
//
// Les trois statuts de l'article (En attente, Validée, Refusée) n'existent pas non plus
// tels quels : la colonne s'appelle « Étape » et ses libellés sont ceux de `STAGE_LABELS`
// (`utils/suivi/suiviRecord.ts`).
//
// Léa Martin a les trois dossiers utiles : une demande en attente de décision, une
// convention transmise et un mini-stage passé où elle a été pointée présente.

import { BASE_URL, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'parents-familles/suivre-les-pre-inscriptions-de-son-enfant';

await withSession('celine.martin', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await shoot.screen('1-ouvrir-le-suivi', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
  ]);

  // L'onglet « Toutes » met les trois dossiers de Léa côte à côte, chacun à une étape
  // différente : c'est ce que l'article demande de savoir lire.
  await page.getByRole('tab', { name: /^Toutes/ }).click();
  await settle(page);
  const table = page.getByRole('table').first();
  const attente = table.getByText('En attente de décision').first();
  await attente.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('2-lire-l-etape-de-chaque-dossier', [
    [2, page.getByRole('tab', { name: /^Toutes/ })],
    [3, attente],
    [3, table.getByText('Convention transmise').first()],
  ]);

  // Le tiroir : c'est lui, et lui seul, qui dit lequel des deux établissements manque.
  await attente.click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-l-avancement-du-dossier', [
    [4, tiroir.getByText('Avancement du dossier')],
  ]);

  const decisions = tiroir.getByText('Décisions', { exact: true });
  await decisions.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('4-les-deux-decisions-attendues', [[5, decisions]]);
});
