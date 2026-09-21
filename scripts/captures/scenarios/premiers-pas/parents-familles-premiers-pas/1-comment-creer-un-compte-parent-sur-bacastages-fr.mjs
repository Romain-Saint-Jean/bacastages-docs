// Captures de articles/premiers-pas/parents-familles-premiers-pas/1-comment-creer-un-compte-parent-sur-bacastages-fr.md
//
// Le parcours d'une famille. Comme celui du Compte Inscription, il va droit aux
// coordonnées, sans écran de rôle. Son dernier volet a deux particularités : il demande
// l'établissement **actuel** de l'enfant, et il offre « Mon enfant n'est pas scolarisé ».
//
// Rien n'est envoyé : le formulaire est rempli jusqu'au dernier écran, jamais soumis.

import { BASE_URL, settle, withPublicPage } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/parents-familles-premiers-pas/1-comment-creer-un-compte-parent-sur-bacastages-fr';

await withPublicPage(ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(BASE_URL);
  await settle(page);
  await shoot.screen('1-creer-un-compte-gratuit', [
    [1, page.getByRole('link', { name: 'Créer un compte gratuit' }).first()],
  ]);

  await page.goto(`${BASE_URL}/signup`);
  await settle(page);
  const famille = page.getByText('Préinscrivez votre enfant à un mini-stage et suivez son parcours');
  await shoot.screen('2-choisir-le-profil-famille', [[2, famille]]);

  await famille.click();
  await settle(page);
  await page.fill('#su-last', 'Martin');
  await page.fill('#su-first', 'Céline');
  await page.fill('#su-phone', '0612345678');
  await settle(page);
  await shoot.screen('3-vos-coordonnees', [
    [3, page.locator('#su-last')],
    [4, page.locator('#su-first')],
    [5, page.locator('#su-phone')],
    [6, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  await page.fill('#su-email', 'celine.martin@demo.bacastages.fr');
  await page.fill('#su-pwd', 'Mini-Stages-2026!');
  await page.fill('#su-pwd2', 'Mini-Stages-2026!');
  await settle(page);
  await shoot.screen('4-vos-identifiants', [
    [7, page.locator('#su-email')],
    [8, page.locator('#su-pwd')],
    [9, page.locator('#su-pwd2')],
    [10, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);

  // Champ laissé vide : la recherche d'établissement ne répond pas sur un navigateur sans
  // session, et c'est celui de toute famille qui lit cet article.
  await shoot.screen('5-l-etablissement-de-votre-enfant', [
    [11, page.getByPlaceholder('Rechercher une école...')],
    [12, page.getByText("Mon enfant n'est pas scolarisé")],
    [13, page.locator('label').filter({ hasText: "J'accepte les conditions" })],
    [14, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
