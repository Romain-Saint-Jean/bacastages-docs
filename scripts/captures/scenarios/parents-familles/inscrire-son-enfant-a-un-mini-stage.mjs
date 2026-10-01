// Captures de articles/parents-familles/inscrire-son-enfant-a-un-mini-stage.md
//
// `celine.martin` demande une place pour Léa sur le mini-stage Cuisine J+10, dont la
// filière exige une préinscription : le bouton d'envoi s'y appelle « Préinscrire ».
//
// Rien n'est envoyé : le formulaire est rempli, jamais soumis, car une demande créée ici
// survivrait au prochain seed et fausserait les autres écrans.
//
// Écart relevé à la capture : le formulaire ne demande pas l'adresse e-mail du parent.
// Il porte « Email à notifier de la pré-inscription (prof principal, secrétaire, etc.) »,
// qui sert à prévenir l'établissement d'origine, puis deux contacts de l'élève. L'article
// a été corrigé.
//
// Les pièces jointes obligatoires existent (`requiredDocuments` dans
// `announcementSignupForm.tsx`) mais dépendent de l'offre : aucune offre de la démo n'en
// réclame, elles ne sont donc pas illustrées.

import { BASE_URL, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'parents-familles/inscrire-son-enfant-a-un-mini-stage';
const OFFRE = 'd0c5a000-0000-4000-8000-000000000311'; // Cuisine et restauration, J+10

await withSession('celine.martin', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/announcements/${OFFRE}`);
  await settle(page);
  const inscrire = page.getByRole('link', { name: "S'inscrire" });
  await inscrire.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-s-inscrire-depuis-la-fiche', [[2, inscrire]]);

  await inscrire.click();
  await page.waitForURL(/\/signup$/, { timeout: 30_000 });
  await settle(page);

  const nom = page.locator('input[name="studentLastName"]');
  const prenom = page.locator('input[name="studentFirstName"]');
  const classe = page.locator('input[name="studentClass"]');
  await nom.waitFor({ timeout: 20_000 });
  await nom.fill('Martin');
  await prenom.fill('Léa');
  await classe.fill('3e');
  await settle(page);
  await shoot.screen('2-les-informations-de-l-eleve', [
    [3, nom],
    [3, prenom],
    [3, classe],
    [4, page.getByText('Élève bénéficiant du dispositif ULIS')],
  ]);

  const aNotifier = page.locator('input[name="notificationProfEmail"]');
  await aNotifier.scrollIntoViewIfNeeded();
  await aNotifier.fill('accueil.chataigniers@demo.bacastages.fr');
  await settle(page);
  await shoot.screen('3-l-email-a-notifier-et-les-contacts', [
    [5, aNotifier],
    [6, page.locator('input[name="studentEmail"]')],
    [6, page.locator('input[name="studentContact"]')],
  ]);

  const envoyer = page.getByRole('button', { name: 'Préinscrire' });
  await envoyer.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('4-le-recapitulatif-et-l-envoi', [
    [7, page.getByText('places restantes').first()],
    [8, envoyer],
  ]);
});
