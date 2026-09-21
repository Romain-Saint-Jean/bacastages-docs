// Captures de articles/premiers-pas/ddf-atddf-bde-personnel-de-direction/2-configuration-de-votre-etablissement-sur-bacastages-fr-partie-1.md
//
// Le lycée de la Sablière vient d'arriver : abonné, rien de configuré. Son panneau de
// mise en place affiche donc les six étapes du mode `SETUP` — c'est l'abonnement qui les
// déclenche, pas le type d'établissement (`resolveOnboardingMode`).
//
// Les formulaires sont remplis, jamais enregistrés : valider marquerait les étapes faites
// et le prochain passage ne trouverait plus le panneau à illustrer.

import { BASE_URL, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/ddf-atddf-bde-personnel-de-direction/2-configuration-de-votre-etablissement-sur-bacastages-fr-partie-1';

// `onboarding: 'open'` : cet article décrit le panneau. `height` : ancré en bas à gauche,
// il déborde sous le pli à 1050 px.
await withSession('nathalie.faure', ARTICLE, async ({ page, shoot }) => {
  const panneau = page.locator('[aria-label="Mise en place de l\'établissement"]');
  await panneau.waitFor();
  await settle(page);

  // Les numéros des encadrés sont ceux des étapes de l'article.
  await shoot.screen('1-le-panneau-de-mise-en-place', [
    [1, panneau.getByRole('link', { name: 'Renseigner les informations' })],
    [2, panneau.getByRole('link', { name: 'Ajouter un professeur' })],
    [3, panneau.getByRole('link', { name: 'Déclarer une filière' })],
  ]);

  // Le panneau a été montré : on le replie pour la suite, comme le lecteur le fera —
  // il couvre sinon la moitié gauche des formulaires à illustrer.
  const lienInfos = panneau.getByRole('link', { name: 'Renseigner les informations' });
  await lienInfos.click();
  await page.waitForURL(/\/school\/infos/);
  await page.getByRole('button', { name: 'Fermer la liste de mise en place' }).click({ timeout: 5_000 }).catch(() => {});
  await settle(page);
  const nom = page.getByPlaceholder('Nom', { exact: true });
  const prenom = page.getByPlaceholder('Prénom', { exact: true });
  const email = page.getByPlaceholder('Entrer une adresse email').first();
  const tel = page.getByPlaceholder('Entrer un numéro de téléphone');
  await nom.fill('Faure');
  await prenom.fill('Nathalie');
  await email.fill('accueil.sabliere@demo.bacastages.fr');
  await tel.fill('06 12 34 56 78');
  await settle(page);
  await shoot.screen('2-les-informations-de-l-etablissement', [
    [4, nom],
    [5, prenom],
    [6, email],
    [7, tel],
  ]);

  await page.goto(`${BASE_URL}/school/profs`);
  await settle(page);
  await shoot.screen('3-la-liste-des-professeurs', [
    [8, page.getByRole('link', { name: 'Ajouter', exact: true })],
  ]);

  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  await page.waitForURL(/\/school\/profs\/add/);
  await settle(page);
  // Les champs portent un `name` stable, là où l'indication varie d'un écran à l'autre.
  const profNom = page.locator('input[name="lastName"]');
  const profPrenom = page.locator('input[name="firstName"]');
  await profNom.waitFor({ timeout: 15_000 });
  await profNom.fill('Delaunay');
  await profPrenom.fill('Camille');
  await settle(page);
  await shoot.screen('4-la-fiche-professeur', [
    [9, profNom],
    [10, profPrenom],
    [11, page.locator('input[name="email"]')],
    [12, page.getByRole('button', { name: 'Enregistrer' })],
  ]);

  await page.goto(`${BASE_URL}/school/structures`);
  await settle(page);
  await shoot.screen('5-la-liste-des-filieres', [
    [13, page.getByRole('link', { name: 'Ajouter', exact: true })],
  ]);

  await page.getByRole('link', { name: 'Ajouter', exact: true }).click();
  await page.waitForURL(/\/school\/structures\/add/);
  await settle(page);
  const filiereNom = page.locator('input[name="name"]');
  await filiereNom.waitFor({ timeout: 15_000 });
  await filiereNom.fill('Métiers de la mode');
  await settle(page);
  // Le bouton « Suivant » n'est pas encadré : il mesure 1258 px de large et déborde de
  // son conteneur, si bien qu'à 1680 px il sort de l'écran par la droite. L'encadrer
  // donnerait une image à moitié coupée, qu'on lirait comme un défaut de la capture et
  // non du produit. Défaut signalé le 21/09/2026 ; à rétablir une fois corrigé.
  await shoot.screen('6-declarer-une-filiere', [
    [14, filiereNom],
    [15, page.locator('[aria-current="step"], .flex').filter({ hasText: 'Débouchés' }).last()],
  ]);
}, { onboarding: 'open', height: 1400 });
