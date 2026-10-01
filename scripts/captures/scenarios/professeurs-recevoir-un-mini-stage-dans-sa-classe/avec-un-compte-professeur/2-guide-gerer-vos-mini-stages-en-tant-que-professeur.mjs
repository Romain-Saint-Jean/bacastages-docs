// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/2-guide-gerer-vos-mini-stages-en-tant-que-professeur.md
//
// Aucune présence n'est pointée et aucun compte rendu n'est enregistré : le mini-stage
// du jour de la démo est à moitié pointé, et c'est cet état que les captures montrent.
//
// Julien Moreau encadre les quatre sessions Maintenance des véhicules, dont celle
// d'aujourd'hui : c'est le seul compte de la démo dont l'onglet « Aujourd'hui » n'est
// pas vide, et donc le seul qui puisse illustrer l'appel.

import { BASE_URL, pinMenu, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/2-guide-gerer-vos-mini-stages-en-tant-que-professeur';

await withSession('julien.moreau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/prof-ministages`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-ouvrir-mini-stages-prof', [
    [1, page.getByRole('link', { name: 'Mini-stages prof', exact: true })],
    [2, page.getByRole('tablist').first()],
  ]);

  // La session du jour : c'est elle que l'article demande d'ouvrir pour faire l'appel.
  const session = page.getByRole('row').filter({ hasText: 'mardi 22 septembre 2026' }).first();
  await session.waitFor({ timeout: 20_000 });
  await shoot.screen('2-deplier-une-session', [[3, session.getByRole('cell').first()]]);

  await session.getByRole('cell').first().click();
  const eleve = page.getByRole('row').filter({ hasText: 'Mehdi Aubert' });
  await eleve.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-ouvrir-le-dossier-d-un-eleve', [
    [4, eleve.getByText('Mehdi Aubert')],
  ]);

  await eleve.getByText('Mehdi Aubert').click();
  const panneau = page.getByRole('dialog').filter({ hasText: "Détail de l'élève" });
  await panneau.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('4-pointer-et-ouvrir-le-compte-rendu', [
    [5, panneau.getByText('Présence', { exact: true })],
    [6, panneau.getByRole('button', { name: 'Rédiger le compte rendu' })],
  ]);
});
