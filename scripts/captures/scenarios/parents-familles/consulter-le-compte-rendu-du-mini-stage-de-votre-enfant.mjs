// Captures de articles/parents-familles/consulter-le-compte-rendu-du-mini-stage-de-votre-enfant.md
//
// Léa Martin a les deux cas dans la même liste : un mini-stage passé dont le compte-rendu
// est complété et commenté, et un mini-stage à venir encore « Non complété », qui sert
// d'exemple au paragraphe « Le compte rendu n'est pas encore là ».
//
// La rubrique est en lecture seule côté famille : aucun des deux tiroirs n'offre de
// formulaire, ce que la capture rend visible mieux qu'une phrase.

import { BASE_URL, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'parents-familles/consulter-le-compte-rendu-du-mini-stage-de-votre-enfant';

await withSession('celine.martin', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/reports`);
  await settle(page);
  const table = page.getByRole('table').first();
  const complete = table.getByText('Maintenance des véhicules').first();
  await complete.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-ouvrir-les-comptes-rendus', [
    [1, page.getByRole('link', { name: 'Comptes-rendus' })],
    [2, complete],
  ]);

  await complete.click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Compte-rendu de mini-stage' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  // Le compte-rendu tient tout entier dans le tiroir, sans défilement : une seule capture
  // suffit, et les trois encadrés y situent les trois blocs que l'article décrit.
  await shoot.screen('2-lire-le-compte-rendu', [
    [3, tiroir.getByText('Satisfaction globale')],
    [4, tiroir.getByText('Évaluation détaillée')],
    [5, tiroir.getByText('Commentaires', { exact: true })],
  ]);

  // Le cas du compte-rendu qui n'est pas encore écrit : même rubrique, autre ligne.
  await page.keyboard.press('Escape');
  await settle(page);
  const attente = table.getByText('Métiers du commerce et de la vente').first();
  await attente.click();
  const vide = page.getByText("L'établissement d'accueil n'a pas encore rédigé le compte-rendu", { exact: false }).first();
  await vide.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-le-compte-rendu-n-est-pas-encore-la', [[6, vide]]);
});
