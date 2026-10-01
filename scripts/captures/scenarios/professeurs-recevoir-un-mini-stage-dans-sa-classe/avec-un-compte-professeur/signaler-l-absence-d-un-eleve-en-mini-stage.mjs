// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/signaler-l-absence-d-un-eleve-en-mini-stage.md
//
// Aucun pointage n'est enregistré : le clic sur « Absent » part immédiatement, sans
// confirmation, et changerait l'état de la démo. Les captures montrent le bouton, pas
// son effet.
//
// L'onglet « Aujourd'hui » de Julien Moreau porte la seule session en cours de la
// démo, à moitié pointée : c'est l'état où les deux boutons sont actifs.

import { BASE_URL, pinMenu, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/signaler-l-absence-d-un-eleve-en-mini-stage';

await withSession('julien.moreau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/prof-ministages`);
  await settle(page);
  await pinMenu(page);

  const aujourdhui = page.getByRole('tab', { name: /Aujourd'hui/ });
  await aujourdhui.waitFor({ timeout: 20_000 });
  await shoot.screen('1-l-onglet-aujourd-hui', [
    [1, page.getByRole('link', { name: 'Mini-stages prof', exact: true })],
    [2, aujourdhui],
  ]);

  await aujourdhui.click();
  await settle(page);
  // La ligne est filtrée sur sa date : `getByRole('row').first()` attrape l'en-tête du
  // tableau, qui n'a pas de `cell` mais des `columnheader`.
  const session = page.getByRole('row').filter({ hasText: 'mardi 22 septembre 2026' }).first();
  await session.waitFor({ timeout: 20_000 });
  await shoot.screen('2-deplier-la-session', [[3, session.getByRole('cell').first()]]);

  await session.getByRole('cell').first().click();
  const eleve = page.getByRole('row').filter({ hasText: 'Mehdi Aubert' });
  await eleve.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-ouvrir-le-dossier', [[4, eleve.getByText('Mehdi Aubert')]]);

  await eleve.getByText('Mehdi Aubert').click();
  const panneau = page.getByRole('dialog').filter({ hasText: "Détail de l'élève" });
  await panneau.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('4-cliquer-sur-absent', [
    [5, panneau.getByRole('button', { name: 'Absent' })],
  ]);
});
