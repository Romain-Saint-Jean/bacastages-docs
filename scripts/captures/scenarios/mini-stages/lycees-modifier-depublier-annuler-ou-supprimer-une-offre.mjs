// Captures de articles/mini-stages/lycees-modifier-depublier-annuler-ou-supprimer-une-offre.md
//
// Rien n'est enregistré, dépublié, annulé ni supprimé : l'article décrit quatre gestes
// destructeurs, et la démo doit rester dans l'état de `scripts/captures/README.md`.
// Le formulaire de modification est ouvert puis quitté sans « Enregistrer ».
//
// L'offre ASSP du 14 octobre est visible et porte deux élèves : c'est l'état qui offre
// les quatre actions en même temps, et qui fait apparaître l'avertissement de
// verrouillage que l'article ne mentionnait pas.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/lycees-modifier-depublier-annuler-ou-supprimer-une-offre';
const OFFRE = 'Accompagnement, soins et services à la personne';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/myannouncements`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-mes-offres', [
    [1, page.getByRole('link', { name: 'Mes offres', exact: true })],
  ]);

  const ligne = page.getByText(OFFRE).first();
  await ligne.waitFor({ timeout: 20_000 });
  await shoot.screen('2-ouvrir-l-offre', [[2, ligne]]);

  await ligne.click();
  const tiroir = page.getByRole('dialog').filter({ hasText: "Actions irréversibles" });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);

  await shoot.screen('3-modifier-ou-depublier', [
    [3, tiroir.getByRole('link', { name: 'Modifier' })],
    [5, tiroir.getByRole('button', { name: 'Rendre non-visible' })],
  ]);

  const irreversibles = tiroir.getByText('Actions irréversibles');
  await irreversibles.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('4-actions-irreversibles', [
    [6, tiroir.getByRole('button', { name: "Annuler l'offre" })],
    [7, tiroir.getByRole('button', { name: 'Supprimer définitivement' })],
  ]);

  // Le formulaire de modification, écran entier : deux recadrages successifs sur les
  // pastilles d'étape rognaient le titre de section à gauche et l'encadré d'alerte à
  // droite, l'un et l'autre plus larges que les cibles visées. L'encadré porte le
  // numéro 3, l'étape de l'article où l'on ouvre ce formulaire.
  await tiroir.getByRole('link', { name: 'Modifier' }).click();
  await page.waitForURL(/\/edit$/, { timeout: 20_000 });
  await settle(page);
  const avertissement = page.getByText(/des inscriptions ont déjà été enregistrées/).first();
  await avertissement.waitFor({ timeout: 20_000 });
  await shoot.screen('5-le-formulaire-de-modification', [[3, avertissement]]);
});
