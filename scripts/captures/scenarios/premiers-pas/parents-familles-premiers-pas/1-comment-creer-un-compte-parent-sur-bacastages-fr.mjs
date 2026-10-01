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

  const search = page.getByPlaceholder('Rechercher une école...');
  await search.click();
  await search.pressSequentially('Chataigniers', { delay: 60 });
  const resultat = page.locator('[cmdk-item]').filter({ hasText: 'Collège Les Châtaigniers' }).first();
  await resultat.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-l-etablissement-de-votre-enfant', [
    [11, search],
    [12, resultat],
  ]);

  await resultat.click();

  // La sélection ouvre une fenêtre de confirmation, comme pour un Compte Inscription,
  // mais avec sa propre question : « Est-ce bien l'établissement où votre enfant est
  // actuellement scolarisé ? » C'est la confusion que le produit cherche à éviter.
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Vérifiez votre sélection' });
  await confirmation.waitFor({ timeout: 15_000 });
  await settle(page);
  const oui = confirmation.getByRole('button', { name: /^Oui/ });
  await shoot.screen('6-confirmer-l-etablissement', [[13, oui]]);

  await oui.click();
  await settle(page);
  const consent = page.locator('label').filter({ hasText: "J'accepte les conditions" });
  await consent.scrollIntoViewIfNeeded();
  await consent.click();
  await settle(page);
  await shoot.screen('7-accepter-et-creer-le-compte', [
    [14, page.getByText("Mon enfant n'est pas scolarisé")],
    [15, consent],
    [16, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
