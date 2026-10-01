// Captures de articles/mini-stages/cycle-de-vie-d-un-mini-stage.md
//
// Article de référence : il suit un dossier d'un bout à l'autre, et aucune partie ne
// voit ce parcours en entier. Le scénario ouvre donc deux sessions, celle du lycée
// d'accueil et celle du collège d'origine, chacune pour l'étape qui lui revient.
//
// Rien n'est modifié : aucune offre publiée, aucune décision prise, aucune présence
// pointée. Les états montrés sont ceux que le seed a posés.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/cycle-de-vie-d-un-mini-stage';

// Étapes 1, 2, 4, 5, 6 et 7, vues du lycée d'accueil.
await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  await page.goto(`${BASE_URL}/myannouncements`);
  await settle(page);
  await pinMenu(page);

  const prete = page.getByRole('row').filter({ hasText: 'Prête à publier' }).first();
  const visible = page.getByRole('row').filter({ hasText: 'Visible' }).first();
  await prete.waitFor({ timeout: 20_000 });
  await shoot.screen('1-l-offre-et-ses-etats', [
    [1, prete.getByRole('cell').nth(4)],
    [2, visible.getByRole('cell').nth(4)],
  ]);

  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  const decision = page.getByRole('table').first().getByText('En attente de décision').first();
  await decision.waitFor({ timeout: 20_000 });
  await shoot.screen('3-la-decision-a-deux', [[4, decision]]);

  // La convention, dans le dossier d'un élève dont elle circule encore.
  await page.getByRole('tab', { name: /^En attente/ }).click();
  await settle(page);
  await page.getByRole('button', { name: 'Voir le détail du dossier de Chloé Dubois' }).click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('4-la-convention-circule', [
    [5, tiroir.getByText('Convention transmise').first()],
  ]);
  await page.keyboard.press('Escape');
  await settle(page);

  // Le pointage, sur l'élève accueilli aujourd'hui : c'est le seul dont le sélecteur
  // soit actif, `canRecordAttendance` n'ouvrant qu'au premier jour du mini-stage.
  await page.getByRole('tab', { name: /^À traiter/ }).click();
  await settle(page);
  const presence = page.getByRole('radiogroup', { name: 'Présence de Mehdi Aubert' });
  await presence.waitFor({ timeout: 20_000 });
  await shoot.screen('5-le-pointage', [[6, presence]]);

  await page.goto(`${BASE_URL}/reports`);
  await settle(page);
  const attente = page.getByRole('tab', { name: /^Non complétés/ });
  await attente.waitFor({ timeout: 20_000 });
  await shoot.screen('6-le-compte-rendu', [
    [7, page.getByRole('link', { name: 'Comptes-rendus', exact: true })],
    [7, attente],
  ]);
});

// Étape 3, vue du collège d'origine : c'est lui qui inscrit ou préinscrit.
await withSession('veronique.blanc', ARTICLE, async ({ page, shoot }) => {
  await page.goto(`${BASE_URL}/announcements`);
  await settle(page);
  const offre = page.getByText('Cuisine et restauration').first();
  await offre.waitFor({ timeout: 20_000 });
  await shoot.screen('2-l-inscription', [
    [3, page.getByRole('link', { name: 'Toutes les offres' }).first()],
    [3, offre],
  ]);
});
