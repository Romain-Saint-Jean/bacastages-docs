// Captures de articles/parents-familles/creer-un-compte-parent-sur-bacastages.md
//
// Même parcours que « 1. Comment créer un compte parent » de Premiers pas, mais l'article
// de cette collection numérote ses étapes une à une, un numéro par champ, là où l'autre
// numérote par volet. Les encadrés suivent donc sa numérotation à lui, et les images
// vivent dans son propre dossier.
//
// Rien n'est envoyé : le formulaire est rempli jusqu'au dernier écran, jamais soumis.

import { BASE_URL, settle, withPublicPage } from '../../lib.mjs';

const ARTICLE = 'parents-familles/creer-un-compte-parent-sur-bacastages';

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
  // La carte « Élève » porte la mention « Bientôt » : l'article prévient qu'elle n'ouvre
  // aucun parcours, et la capture doit la laisser voir.
  await shoot.screen('2-choisir-la-carte-une-famille', [[2, famille]]);

  await famille.click();
  await settle(page);
  await page.fill('#su-first', 'Céline');
  await page.fill('#su-last', 'Martin');
  await page.fill('#su-phone', '0612345678');
  await settle(page);
  // L'écran met le nom avant le prénom ; l'article les annonçait dans l'autre sens, et
  // ses étapes ont été remises dans celui de la saisie.
  await shoot.screen('3-votre-profil', [
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
  await shoot.screen('4-securisez-votre-compte', [
    [7, page.locator('#su-email')],
    [8, page.locator('#su-pwd')],
    [9, page.locator('#su-pwd2')],
    [10, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);

  const search = page.getByPlaceholder('Rechercher une école...');
  await search.click();
  // `fill` pose la valeur d'un coup ; le champ de cmdk ne rouvre sa liste qu'au fil des
  // frappes. On saisit donc caractère par caractère, puis on laisse venir les suggestions.
  await search.pressSequentially('Chataigniers', { delay: 60 });
  const resultat = page.locator('[cmdk-item]').filter({ hasText: 'Collège Les Châtaigniers' }).first();
  await resultat.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-l-etablissement-de-votre-enfant', [
    [11, search],
    [12, resultat],
  ]);

  await resultat.click();

  // Fenêtre de confirmation que l'article ne mentionnait pas : elle s'interpose entre le
  // choix de l'établissement et la création du compte, et pose précisément la question de
  // la confusion que l'article cherche à éviter.
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Vérifiez votre sélection' });
  await confirmation.waitFor({ timeout: 15_000 });
  await settle(page);
  const oui = confirmation.getByRole('button', { name: /^Oui/ });
  await shoot.screen('6-verifiez-votre-selection', [[13, oui]]);

  await oui.click();
  await settle(page);
  const consent = page.locator('label').filter({ hasText: "J'accepte les conditions" });
  await consent.scrollIntoViewIfNeeded();
  await consent.click();
  await settle(page);
  await shoot.screen('7-creer-mon-compte', [
    [14, consent],
    [15, page.getByRole('button', { name: 'Créer mon compte' })],
    [16, page.getByText("Mon enfant n'est pas scolarisé")],
  ]);
});
