// Captures de articles/premiers-pas/ddf-atddf-bde-personnel-de-direction/3-configuration-de-votre-etablissement-sur-bacastages-partie-2.md
//
// Suite de la partie 1, sur le même lycée qui vient d'arriver : la Sablière, abonnée et
// rien de configuré, dont le panneau affiche les six étapes du mode `SETUP`. Les trois
// dernières sont celles de cet article.
//
// Quatre écarts relevés à la capture, corrigés dans l'article :
// - les étapes « Méthode de signature » et « Présentation de l'établissement » portent la
//   mention **(optionnel)** et un bouton « Marquer terminée » : elles ne sont pas
//   bloquantes, contrairement à ce que disait l'article ;
// - l'étape « Choix de la convention » ne se contente pas de laisser la convention
//   officielle en place : elle demande de la **confirmer** par « Utiliser ce modèle » ;
// - le mode papier ne s'appelle pas « signature manuscrite » mais **« Signature
//   visuelle »**, et le mode en ligne **« Signature électronique, avec repli papier »** ;
// - basculer en signature électronique n'ouvre **aucune fenêtre de confirmation** : le
//   choix est pris tout de suite, et l'assistant passe de cinq à six étapes.
//
// Aucun formulaire n'est enregistré : valider marquerait les étapes faites et le prochain
// passage ne trouverait plus le panneau à illustrer.

import { BASE_URL, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/ddf-atddf-bde-personnel-de-direction/3-configuration-de-votre-etablissement-sur-bacastages-partie-2';

// `onboarding: 'open'` : cet article décrit le panneau. `height` : ancré en bas à gauche,
// il déborde sous le pli à 1050 px.
await withSession('nathalie.faure', ARTICLE, async ({ page, shoot }) => {
  const panneau = page.locator('[aria-label="Mise en place de l\'établissement"]');
  await panneau.waitFor();
  await settle(page);

  // Le panneau liste les six étapes et défile à l'intérieur de lui-même : à 1400 px de
  // haut, les trois dernières, celles de cet article, sont sous le pli de sa liste.
  // On l'amène sur la dernière avant d'encadrer, sinon les repères tombent hors écran.
  await panneau.getByRole('link', { name: 'Compléter la présentation' }).scrollIntoViewIfNeeded();
  await settle(page);

  // Les numéros des encadrés sont ceux des étapes de l'article.
  await shoot.screen('1-les-trois-dernieres-etapes', [
    [1, panneau.getByRole('link', { name: 'Choisir un modèle' })],
    [3, panneau.getByRole('link', { name: 'Régler la signature' })],
    [7, panneau.getByRole('link', { name: 'Compléter la présentation' })],
  ]);

  // Le panneau a été montré : on le replie pour la suite, comme le lecteur le fera. Il
  // couvre sinon la moitié gauche des écrans à illustrer.
  await panneau.getByRole('link', { name: 'Choisir un modèle' }).click();
  await page.waitForURL(/\/school\/conventions/);
  await page.getByRole('button', { name: 'Fermer la liste de mise en place' }).click({ timeout: 5_000 }).catch(() => {});
  await settle(page);
  const utiliser = page.getByRole('button', { name: 'Utiliser ce modèle' });
  await utiliser.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('2-confirmer-le-modele-de-convention', [
    [2, utiliser],
    [2, page.getByRole('button', { name: 'Ajouter un modèle' }).first()],
  ]);

  await page.goto(`${BASE_URL}/school/conventions?etape=reglages`);
  await settle(page);
  // Chaque mode est une ligne « bouton radio + intitulé + explication ». Encadrer le seul
  // intitulé posait le numéro par-dessus l'explication : on encadre la ligne entière.
  const choix = (intitule) => page.locator('.space-x-3.space-y-0').filter({ hasText: intitule });
  const visuelle = choix('Signature visuelle');
  const electronique = choix('Signature électronique, avec repli papier');
  await visuelle.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('3-comment-vous-signez', [
    [5, visuelle],
    [5, electronique],
  ]);

  // Le signataire : trois champs, dans l'ordre de l'écran. Ils sont remplis pour que la
  // capture montre un formulaire vivant, jamais enregistrés.
  const nom = page.locator('input[name="conventionSignerName"]');
  const email = page.locator('input[name="conventionSignerEmail"]');
  const qualite = page.locator('input[name="conventionSignerTitle"]');
  await nom.fill('Nathalie Faure');
  await email.fill('nathalie.faure@demo.bacastages.fr');
  await qualite.fill('Proviseure');
  await nom.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('4-le-signataire-des-conventions', [
    [4, nom],
    [4, email],
    [4, qualite],
    [6, page.getByRole('button', { name: 'Étape suivante' })],
  ]);

  await page.goto(`${BASE_URL}/school/landing`);
  await settle(page);
  const description = page.getByText('Le texte d\'accueil de votre fiche publique');
  await description.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-decrire-votre-lycee', [
    [8, description],
    [8, page.getByText('Profil de l\'établissement')],
  ]);

  // Le sous-titre de la galerie est repris mot pour mot dans l'aide du champ de dépôt, à
  // la casse près, et `getByText` non exact ignore la casse : on vise les intitulés.
  const galerie = page.getByText('Galerie d\'images');
  await galerie.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('6-le-logo-la-galerie-et-l-enregistrement', [
    [9, page.getByText('Logo de l\'établissement')],
    [9, galerie],
    [10, page.getByRole('button', { name: 'Enregistrer' })],
  ]);
}, { onboarding: 'open', height: 1400 });
