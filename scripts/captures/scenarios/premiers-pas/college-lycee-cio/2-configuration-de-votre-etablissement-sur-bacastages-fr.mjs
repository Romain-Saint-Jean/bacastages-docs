// Captures de articles/premiers-pas/college-lycee-cio/2-configuration-de-votre-etablissement-sur-bacastages-fr.md
//
// Le collège du Pré-aux-Clercs vient d'arriver : rien n'est renseigné, et son panneau de
// mise en place affiche ses deux étapes bloquantes. Le compte est un « Compte
// Inscription » (rôle `college`), celui que crée le parcours d'inscription de l'article
// précédent — c'est lui qui voit la barre de navigation horizontale.
//
// Les deux étapes du panneau mènent au **même écran**, `/school/infos`, et un seul
// « Enregistrer » les valide toutes les deux. Le formulaire est rempli, jamais soumis :
// l'enregistrer marquerait les étapes faites et le prochain passage ne trouverait plus
// le panneau à illustrer.

import { settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'premiers-pas/college-lycee-cio/2-configuration-de-votre-etablissement-sur-bacastages-fr';

// `onboarding: 'open'` : cet article décrit le panneau, on ne le replie donc pas.
await withSession('olivier.chevrier', ARTICLE, async ({ page, shoot }) => {
  const panneau = page.locator('[aria-label="Mise en place de l\'établissement"]');
  await panneau.waitFor();
  await settle(page);

  // Les numéros des encadrés sont ceux des étapes de l'article.
  await shoot.screen('1-le-panneau-de-mise-en-place', [
    [1, panneau.getByRole('link', { name: 'Renseigner les informations' })],
    [2, panneau.getByRole('link', { name: 'Déclarer le signataire' })],
  ]);

  await panneau.getByRole('link', { name: 'Renseigner les informations' }).click();
  await page.waitForURL(/\/school\/infos/);
  await settle(page);

  // Les libellés ne sont pas reliés à leur champ : on vise par l'indication du champ.
  const chefNom = page.getByPlaceholder('Nom', { exact: true });
  const chefPrenom = page.getByPlaceholder('Prénom', { exact: true });
  const email = page.getByPlaceholder('Entrer une adresse email').first();
  const tel = page.getByPlaceholder('Entrer un numéro de téléphone');
  await chefNom.fill('Chevrier');
  await chefPrenom.fill('Olivier');
  await email.fill('accueil.pre-aux-clercs@demo.bacastages.fr');
  await tel.fill('06 12 34 56 78');
  await settle(page);
  await shoot.screen('2-le-chef-d-etablissement-et-le-contact', [
    [3, chefNom],
    [4, chefPrenom],
    [5, email],
    [6, tel],
  ]);

  const signataire = page.getByPlaceholder('Nom et prénom du signataire');
  const signataireEmail = page.getByPlaceholder('Entrer une adresse email').last();
  const qualite = page.getByPlaceholder('Principal, Principale adjointe…');
  await signataire.fill('Olivier Chevrier');
  await signataireEmail.fill('olivier.chevrier@demo.bacastages.fr');
  await qualite.fill('Principal');
  await signataire.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('3-le-signataire-des-conventions', [
    [7, signataire],
    [8, signataireEmail],
    [9, qualite],
    [10, page.getByRole('button', { name: 'Enregistrer' })],
  ]);
}, { onboarding: 'open', height: 1400 });
