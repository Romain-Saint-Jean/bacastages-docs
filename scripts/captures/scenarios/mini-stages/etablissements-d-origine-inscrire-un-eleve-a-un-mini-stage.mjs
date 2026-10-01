// Captures de articles/mini-stages/etablissements-d-origine-inscrire-un-eleve-a-un-mini-stage.md
//
// Le formulaire n'est jamais validé : la démo doit garder ses quinze préinscriptions.
//
// Deux écarts relevés à l'écran, corrigés dans l'article :
//
// - le second champ de contact « pour notifier une autre personne » n'existe pas pour
//   un établissement d'origine. `announcementSignupForm.tsx:741` le réserve à
//   `user.role === ROLES.PARENT` ; un Compte Inscriptions voit « Email de l'élève
//   (optionnel) » et « Téléphone de l'élève (optionnel) », et rien d'autre ;
// - aucune filière de la démo ne déclare de pièce jointe, donc l'étape « Joindre les
//   pièces demandées » n'est pas illustrable ici. Elle reste dans l'article, sans image.
//
// L'offre Cuisine et restauration porte la préinscription : son bouton final dit
// « Préinscrire », et c'est le cas que l'article distingue de l'inscription directe.

import { BASE_URL, pinMenu, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/etablissements-d-origine-inscrire-un-eleve-a-un-mini-stage';

await withSession('veronique.blanc', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/announcements`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-ouvrir-la-recherche', [
    [1, page.getByRole('link', { name: 'Toutes les offres' }).first()],
    [2, page.getByText('DISPONIBILITÉ')],
  ]);

  const carte = page.getByText('Cuisine et restauration').first();
  await carte.waitFor({ timeout: 20_000 });
  await shoot.screen('2-ouvrir-une-offre', [[3, carte]]);

  await carte.click();
  const inscrire = page.getByRole('link', { name: "S'inscrire" });
  await inscrire.waitFor({ timeout: 20_000 });
  await inscrire.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('3-s-inscrire', [[4, inscrire]]);

  await inscrire.click();
  await page.waitForURL(/\/signup$/, { timeout: 20_000 });
  await settle(page);

  // Le formulaire est rempli avant d'être capturé, sans jamais être envoyé : une
  // capture d'un formulaire vide montre des champs, pas ce qu'on y met. L'élève est
  // inventé et son adresse est au domaine de démo, qui ne délivre rien.
  await page.getByPlaceholder('Nom', { exact: true }).fill('Dubreuil');
  await page.getByPlaceholder('Prénom', { exact: true }).fill('Nina');
  await page.getByPlaceholder('Classe', { exact: true }).fill('3e B');
  const emails = page.getByPlaceholder('Entrer une adresse email');
  await emails.first().fill('responsable.dubreuil@demo.bacastages.fr');
  await settle(page);

  await shoot.screen('4-renseigner-l-eleve', [
    [5, page.getByText('Élève', { exact: true })],
    [6, page.getByText('Contacts', { exact: true })],
  ]);

  const valider = page.getByRole('button', { name: 'Préinscrire' });
  await valider.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('5-relire-et-valider', [
    [8, page.getByText('places restantes')],
    [9, valider],
  ]);
});
