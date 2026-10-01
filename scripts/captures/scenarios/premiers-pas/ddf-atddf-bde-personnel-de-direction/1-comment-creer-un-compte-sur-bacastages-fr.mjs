// Captures de articles/premiers-pas/ddf-atddf-bde-personnel-de-direction/1-comment-creer-un-compte-sur-bacastages-fr.md
//
// Le seul parcours du Help Center qui se joue sans compte : le lecteur n'en a pas encore.
// Rien n'est envoyé — le formulaire est rempli jusqu'au dernier écran, jamais soumis, pour
// ne pas créer de compte dans la base de démo.
//
// L'adresse et le lycée saisis sont ceux de l'univers fictif : « Claire Martin » n'existe
// pas, et le Val d'Arnon porte un UAI en 999000.

import { BASE_URL, settle, withPublicPage } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/ddf-atddf-bde-personnel-de-direction/1-comment-creer-un-compte-sur-bacastages-fr';

await withPublicPage(ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(BASE_URL);
  await settle(page);
  await shoot.screen('1-ouvrir-la-page-d-inscription', [
    [1, page.getByRole('link', { name: 'Créer un compte' }).first()],
  ]);

  await page.goto(`${BASE_URL}/signup`);
  await settle(page);
  const lycee = page.getByText('Gérer les inscriptions et suivre les mini-stages de votre lycée');
  await shoot.screen('2-choisir-le-profil-lycee', [[2, lycee]]);

  await lycee.click();
  await settle(page);
  const ddf = page.getByText('Poster des offres de mini-stages et gérer votre établissement');
  await shoot.screen('3-choisir-votre-role-au-lycee', [
    [3, ddf],
    [4, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await ddf.click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  await page.fill('#su-last', 'Martin');
  await page.fill('#su-first', 'Claire');
  await page.fill('#su-phone', '0612345678');
  await settle(page);
  await shoot.screen('4-volet-responsable', [
    [5, page.locator('#su-last')],
    [6, page.locator('#su-first')],
    [7, page.locator('#su-phone')],
    [8, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  await page.fill('#su-email', 'claire.martin@demo.bacastages.fr');
  await page.fill('#su-pwd', 'Mini-Stages-2026!');
  await page.fill('#su-pwd2', 'Mini-Stages-2026!');
  await settle(page);
  await shoot.screen('5-volet-securite', [
    [9, page.locator('#su-email')],
    [10, page.locator('#su-pwd')],
    [11, page.locator('#su-pwd2')],
    [12, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);

  const search = page.getByPlaceholder('Rechercher une école...');
  await search.click();
  // `fill` pose la valeur d'un coup ; le champ de cmdk ne rouvre sa liste qu'au fil des
  // frappes. On saisit donc caractère par caractère, puis on laisse venir les suggestions.
  await search.pressSequentially('Val d\'Arnon', { delay: 60 });
  const resultat = page.locator('[cmdk-item]').filter({ hasText: "Lycée professionnel du Val d'Arnon" }).first();
  await resultat.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('6-trouver-votre-lycee', [
    [13, search],
    [14, resultat],
  ]);

  await resultat.click();
  const consent = page.locator('label').filter({ hasText: "J'accepte les conditions" });
  await consent.click();
  await settle(page);
  await shoot.screen('7-accepter-et-creer-le-compte', [
    [15, consent],
    [16, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
