// Captures de articles/mini-stages/lycees-suivre-les-eleves-accueillis-et-pointer-leur-presence.md
//
// L'article donnait le sélecteur de présence dans l'ordre « Présent » puis « Absent ».
// L'écran le rend dans l'autre sens : `radiogroup` « Présence de <élève> », avec
// « Absent » en premier. Corrigé dans l'article, comme la PR #11 le fait de son côté.
//
// Le compte est `philippe.rousseau` plutôt que la vie scolaire : l'article s'adresse
// d'abord à la direction, et l'administrateur voit la totalité des colonnes, dont
// « Places restantes » et « Paiement cantine » que l'article mentionne.
//
// Mehdi Aubert est l'élève du mini-stage du jour : c'est le seul dont le sélecteur de
// présence soit actif, le pointage n'ouvrant que le premier jour.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/lycees-suivre-les-eleves-accueillis-et-pointer-leur-presence';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-ouvrir-le-suivi', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
  ]);

  await shoot.screen('2-le-sens-et-les-onglets', [
    [2, page.getByRole('radiogroup', { name: 'Sens du mini-stage' })],
    [3, page.getByRole('tablist')],
  ]);

  await shoot.screen('3-l-annee-scolaire', [
    [4, page.getByRole('combobox', { name: 'Année scolaire' })],
  ]);

  // Le sélecteur de présence, sur la ligne de l'élève accueilli aujourd'hui.
  const presence = page.getByRole('radiogroup', { name: 'Présence de Mehdi Aubert' });
  await presence.waitFor({ timeout: 20_000 });
  await shoot.screen('4-pointer-la-presence', [[5, presence]]);

  // Le tiroir de détail, ouvert sur la frise d'avancement.
  await page.getByRole('button', { name: 'Voir le détail du dossier de Mehdi Aubert' }).click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-ouvrir-le-dossier', [
    [6, tiroir.getByText('Avancement du dossier')],
  ]);
});
