// Captures de articles/mini-stages/etablissements-desinscrire-un-eleve-d-un-mini-stage.md
//
// Aucune désinscription n'est confirmée : la fenêtre se ferme par « Annuler ». Théo
// Garcia, désinscrit par le seed, porte déjà le bouton « Réinscrire » que la dernière
// capture montre.
//
// L'article situait « Désinscrire l'élève » à côté de « Renvoyer l'email » et de
// « Supprimer la préinscription ». Les trois ne coexistent jamais : `canUnsubscribe`
// exige `source === "participant"`, les deux autres `source === "preregistration"`
// (`utils/suivi/suiviPermissions.ts`). Vérifié à l'écran sur les deux sortes de
// dossier, et corrigé dans l'article.
//
// Chloé Dubois est inscrite sur un mini-stage à venir : c'est la fenêtre où la
// désinscription est offerte, `canUnsubscribe` exigeant `isBeforeStart`.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/etablissements-desinscrire-un-eleve-d-un-mini-stage';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await pinMenu(page);

  await page.getByRole('tab', { name: /^Toutes/ }).click();
  await settle(page);
  await page.getByRole('textbox', { name: 'Rechercher…' }).fill('Chloé');
  await settle(page);

  const ligne = page.getByRole('row').filter({ hasText: 'Chloé Dubois' });
  await ligne.first().waitFor({ timeout: 20_000 });
  await shoot.screen('1-retrouver-l-eleve', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
    [2, page.getByRole('textbox', { name: 'Rechercher…' })],
    [3, ligne.getByRole('button', { name: 'Voir le détail du dossier de Chloé Dubois' })],
  ]);

  await ligne.getByRole('button', { name: 'Voir le détail du dossier de Chloé Dubois' }).click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });

  // Les actions vivent au bas du tiroir : sans ce défilement, le bouton reste sous le
  // pli et la garde de `boxOf` refuse l'encadré.
  const desinscrire = tiroir.getByRole('button', { name: "Désinscrire l'élève" });
  await desinscrire.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('2-desinscrire-l-eleve', [[4, desinscrire]]);

  await desinscrire.click();
  const fenetre = page.getByRole('dialog').filter({ hasText: "Désinscription d'un élève" });
  await fenetre.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-la-justification', [
    [5, fenetre.getByText('Justifications (optionnel)')],
    [6, fenetre.getByRole('button', { name: 'Désinscrire', exact: true })],
  ]);

  await fenetre.getByRole('button', { name: 'Annuler' }).click();
  await settle(page);
  await page.keyboard.press('Escape');
  await settle(page);

  // « Vous vous êtes trompé » est une section sans numéro d'étape : recadrage sans
  // encadré numéroté.
  await page.getByRole('textbox', { name: 'Rechercher…' }).fill('Théo');
  await settle(page);
  const theo = page.getByRole('row').filter({ hasText: 'Théo Garcia' });
  const reinscrire = theo.getByRole('button', { name: 'Réinscrire' });
  await reinscrire.waitFor({ timeout: 20_000 });
  await shoot(
    '4-reinscrire',
    [theo.getByRole('cell').first(), theo.getByRole('cell').last()],
    { highlights: [reinscrire] },
  );
});
