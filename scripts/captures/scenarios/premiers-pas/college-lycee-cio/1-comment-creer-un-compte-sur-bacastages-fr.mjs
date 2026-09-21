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

  const search = page.getByPlaceholder('Rechercher une école...');
  await search.click();
  await search.pressSequentially('Chataigniers', { delay: 60 });
  const resultat = page.locator('[cmdk-item]').filter({ hasText: 'Collège Les Châtaigniers' }).first();
  await resultat.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-trouver-votre-etablissement', [
    [11, search],
    [12, resultat],
  ]);

  await resultat.click();

  // La sélection ouvre une fenêtre de confirmation — le parcours lycée n'en a pas. Elle
  // existe parce que la confusion est fréquente : un Compte Inscription doit déclarer
  // l'établissement d'où **partent** les élèves, pas celui qui les accueille.
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Vérifiez votre sélection' });
  await confirmation.waitFor({ timeout: 15_000 });
  await settle(page);
  const oui = confirmation.getByRole('button', { name: "Oui, c'est le bon établissement" });
  await shoot.screen('6-confirmer-votre-etablissement', [[13, oui]]);

  await oui.click();
  await settle(page);
  const consent = page.locator('label').filter({ hasText: "J'accepte les conditions" });
  await consent.scrollIntoViewIfNeeded();
  await consent.click();
  await settle(page);
  await shoot.screen('7-accepter-et-creer-le-compte', [
    [14, consent],
    [15, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
