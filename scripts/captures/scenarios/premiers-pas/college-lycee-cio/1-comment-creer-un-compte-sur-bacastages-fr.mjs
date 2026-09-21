// Captures de articles/premiers-pas/college-lycee-cio/1-comment-creer-un-compte-sur-bacastages-fr.md
//
// Le parcours du « Compte Inscription » — celui des établissements qui envoient leurs
// élèves. Il est plus court que celui du lycée : la carte du profil mène directement aux
// coordonnées, sans écran de rôle.
//
// Rien n'est envoyé : le formulaire est rempli jusqu'au dernier écran, jamais soumis.

import { BASE_URL, settle, withPublicPage } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/college-lycee-cio/1-comment-creer-un-compte-sur-bacastages-fr';

await withPublicPage(ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(BASE_URL);
  await settle(page);
  await shoot.screen('1-ouvrir-la-page-d-inscription', [
    [1, page.getByRole('link', { name: 'Créer un compte' }).first()],
  ]);

  await page.goto(`${BASE_URL}/signup`);
  await settle(page);
  const carte = page.getByText('Inscrire un élève à un mini-stage ou valider une préinscription');
  await shoot.screen('2-choisir-le-profil-compte-inscription', [[2, carte]]);

  await carte.click();
  await settle(page);
  await page.fill('#su-last', 'Blanc');
  await page.fill('#su-first', 'Véronique');
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
  await page.fill('#su-email', 'veronique.blanc@demo.bacastages.fr');
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

  // Champ laissé vide : sur un navigateur sans session — celui de tout lecteur de cet
  // article — la recherche d'établissement ne répond jamais (voir le scénario du parcours
  // lycée). Une capture du sablier n'apprendrait rien.
  await shoot.screen('5-relier-votre-etablissement', [
    [11, page.getByPlaceholder('Rechercher une école...')],
    [12, page.locator('label').filter({ hasText: "J'accepte les conditions" })],
    [13, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
