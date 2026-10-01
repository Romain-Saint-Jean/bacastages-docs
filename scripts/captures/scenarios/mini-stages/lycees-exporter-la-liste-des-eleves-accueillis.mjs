// Captures de articles/mini-stages/lycees-exporter-la-liste-des-eleves-accueillis.md
//
// L'export n'est jamais lancé : le téléchargement n'ajoute rien à l'article, et la
// démo n'a pas de fichiers dans son stockage. La fenêtre se ferme par « Fermer ».
//
// La liste « Filières à exporter » n'apparaît qu'une fois « Exportation de toutes les
// filières » décochée : c'est le geste de l'étape 7, et la capture le montre dans cet
// état plutôt que de décrire une liste invisible.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/lycees-exporter-la-liste-des-eleves-accueillis';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-lancer-l-export', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
    [2, page.getByRole('combobox', { name: 'Année scolaire' })],
    [3, page.getByRole('button', { name: 'Exporter' }).first()],
  ]);

  await page.getByRole('button', { name: 'Exporter' }).first().click();
  const fenetre = page.getByRole('dialog').filter({ hasText: 'Exporter la liste des mini-stages' });
  await fenetre.waitFor({ timeout: 20_000 });
  await settle(page);

  await shoot.screen('2-la-periode-et-le-format', [
    [4, fenetre.getByText('Période', { exact: true })],
    [5, fenetre.getByText("Format d'export", { exact: true })],
  ]);

  const toutes = fenetre.getByRole('checkbox').first();
  await shoot.screen('3-toutes-les-filieres', [
    [6, fenetre.getByText('Exportation de toutes les filières')],
  ]);

  // `force` : la case est un bouton `role=checkbox` posé sous son libellé, et le clic
  // ordinaire se fait intercepter par celui-ci.
  await toutes.click({ force: true });
  // `exact` : sans lui, le libellé d'aide « … ou sélectionner les filières à exporter »
  // l'emporte, et l'encadré désigne une phrase au lieu du titre de la liste.
  const liste = fenetre.getByText('Filières à exporter', { exact: true });
  await liste.waitFor({ timeout: 10_000 });
  await settle(page);
  await shoot.screen('4-choisir-les-filieres', [
    [7, liste],
    [8, fenetre.getByRole('button', { name: 'Exporter' })],
  ]);
});
