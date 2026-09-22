// Captures de articles/premiers-pas/ddf-atddf-bde-personnel-de-direction/4-ajouter-vos-premieres-offres-de-mini-stage.md
//
// Vu par la DDF du Val d'Arnon, le lycée configuré de la démo : c'est le seul qui ait des
// filières et des professeurs à proposer au formulaire.
//
// Trois écarts relevés à la capture, corrigés dans l'article :
// - le bouton d'ajout ne s'appelle pas « Ajouter » mais **« Publier »**, dans la carte
//   « Proposez un mini-stage » ; à côté de lui, « Importer » ouvre l'import par tableur,
//   que l'article ne mentionnait pas ;
// - le formulaire n'est plus une page unique : c'est un **assistant en trois volets**
//   (Dates & Horaires, Établissement, Description), et les rubriques de l'article ne
//   tombaient pas dans le bon ;
// - la salle se saisit dans le volet Établissement, avec les places et la filière, et non
//   dans un volet d'« informations complémentaires ».
//
// Le formulaire est rempli jusqu'au dernier volet, jamais enregistré : une offre créée ici
// survivrait au prochain seed et fausserait les comptes de « Mes offres ».

import { BASE_URL, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/ddf-atddf-bde-personnel-de-direction/4-ajouter-vos-premieres-offres-de-mini-stage';

await withSession('karine.lemoine', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/myannouncements`);
  await settle(page);
  const publier = page.getByRole('link', { name: 'Publier' });
  await publier.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-proposez-un-mini-stage', [
    [1, publier],
    [2, page.getByRole('button', { name: 'Importer' })],
  ]);

  await publier.click();
  await page.waitForURL(/\/myannouncements\/add/);
  await settle(page);

  // Volet 1. Le calendrier rend ses jours comme des boutons portant le seul quantième ;
  // on prend un lundi à venir, puis un créneau proposé.
  const jour = page.locator('button').filter({ hasText: /^28$/ }).first();
  await jour.waitFor({ timeout: 20_000 });
  await jour.click();
  const creneau = page.getByRole('button', { name: '09:00 – 12:00' }).first();
  await creneau.waitFor({ timeout: 20_000 });
  await creneau.click();
  // Choisir une date fait défiler la page jusqu'aux horaires : on remonte, sinon le fil
  // des trois volets, ce que cet écran a de nouveau, sort de la capture par le haut.
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await shoot.screen('2-les-dates-et-les-horaires', [
    [3, page.getByText('Session de plusieurs jours')],
    [4, creneau],
    [5, page.getByRole('button', { name: 'Suivant' })],
  ]);

  // Volet 2.
  await page.getByRole('button', { name: 'Suivant' }).click();
  const places = page.getByRole('textbox', { name: 'Nombre de places maximum' });
  await places.waitFor({ timeout: 20_000 });
  await places.fill('6');
  const filiere = page.getByRole('combobox', { name: 'Filière' });
  await filiere.click();
  // La première entrée de la liste est « Ajouter une filière », qui quitte le formulaire :
  // on désigne la filière par son nom.
  await page.getByRole('option', { name: /^Cuisine et restauration/ }).first().click();
  await settle(page);
  const salle = page.locator('input[name="classroom"]');
  await salle.fill('Cuisine pédagogique');
  await settle(page);
  await shoot.screen('3-les-places-la-filiere-et-la-salle', [
    [6, places],
    [7, filiere],
    [8, salle],
  ]);

  // La liste des professeurs est filtrée sur la filière choisie ; les autres restent
  // derrière « Afficher les autres professeurs ».
  const prof1 = page.getByRole('combobox', { name: 'Professeur(e) 1' });
  await prof1.click();
  await page.getByRole('option', { name: 'Isabelle Petit' }).click();
  await settle(page);
  await shoot.screen('4-les-professeurs-encadrants', [
    [9, prof1],
    [10, page.getByRole('combobox', { name: /Professeur\(e\) 2/ })],
  ]);

  // Volet 3.
  await page.getByRole('button', { name: 'Suivant' }).click();
  const publication = page.getByText("Publier l'offre maintenant");
  await publication.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('5-la-description-et-la-publication', [
    [11, page.getByText('Description (optionnel)')],
    [12, publication],
    [13, page.getByRole('button', { name: 'Enregistrer' })],
  ]);

  // Le résultat attendu, lu sur les offres déjà présentes : les onglets disent où se
  // range une offre publiée et une offre restée en brouillon.
  await page.goto(`${BASE_URL}/myannouncements`);
  await settle(page);
  await shoot.screen('6-ou-se-range-votre-offre', [
    [14, page.getByRole('tab', { name: /^Prêtes à publier/ })],
    [15, page.getByRole('tab', { name: /^Visibles/ })],
  ]);
});
