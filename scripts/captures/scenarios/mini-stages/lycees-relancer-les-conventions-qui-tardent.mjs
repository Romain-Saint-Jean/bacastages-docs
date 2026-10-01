// Captures de articles/mini-stages/lycees-relancer-les-conventions-qui-tardent.md
//
// Aucune relance n'est envoyée : la fenêtre s'ouvre et se ferme par « Annuler ». Les
// courriels de la démo partent vers l'adresse de test Resend, mais un envoi daterait
// les relances du jour et fausserait les captures suivantes.
//
// L'article compte deux sections numérotées à part, « Relancer un seul dossier » et
// « Relancer toute une sélection ». Chaque capture est posée dans sa section, et son
// encadré suit la numérotation de celle-ci.
//
// Chloé Dubois porte une convention transmise et pas encore déposée : c'est le seul
// état où l'encadré « Convention transmise » offre « Relancer les parties ».

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/lycees-relancer-les-conventions-qui-tardent';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await pinMenu(page);

  await page.getByRole('tab', { name: /^En attente/ }).click();
  await settle(page);

  // Section « Relancer un seul dossier », étape 3.
  await page.getByRole('button', { name: 'Voir le détail du dossier de Chloé Dubois' }).click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-relancer-les-parties', [
    [3, tiroir.getByRole('button', { name: 'Relancer les parties' })],
  ]);

  await page.keyboard.press('Escape');
  await settle(page);

  // Section « Relancer toute une sélection », étapes 1 à 6.
  const lignes = page.getByRole('row');
  // Les deux dossiers cochés sont pris en haut de liste : plus bas, la case passe
  // sous le pli et la garde de `boxOf` refuse l'encadré, à raison.
  const chloe = lignes.filter({ hasText: 'Chloé Dubois' });
  const yanis = lignes.filter({ hasText: 'Yanis Haddad' });

  await shoot.screen('2-les-dossiers-en-attente', [
    [1, page.getByRole('tab', { name: /^En attente/ })],
    [2, chloe.getByRole('checkbox')],
    [2, yanis.getByRole('checkbox')],
  ]);

  // `force` : la case est un bouton `role=checkbox` que son libellé recouvre.
  await chloe.getByRole('checkbox').click({ force: true });
  await yanis.getByRole('checkbox').click({ force: true });
  await settle(page);

  const relance = page.getByRole('button', { name: /^Relance convention/ });
  await relance.waitFor({ timeout: 20_000 });
  await shoot.screen('3-la-barre-de-selection', [[3, relance]]);

  await relance.click();
  const fenetre = page.getByRole('dialog').filter({ hasText: 'Relance convention' });
  await fenetre.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('4-choisir-les-destinataires', [
    [4, fenetre.getByText('Destinataires de la relance')],
    [5, fenetre.getByText('Recevoir une copie du rappel (aperçu)')],
    [6, fenetre.getByRole('button', { name: 'Envoyer les relances' })],
  ]);

  await fenetre.getByRole('button', { name: 'Annuler' }).click();
  await settle(page);
});
