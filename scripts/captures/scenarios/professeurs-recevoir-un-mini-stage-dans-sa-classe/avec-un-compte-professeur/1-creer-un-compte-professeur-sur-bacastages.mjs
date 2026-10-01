// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/1-creer-un-compte-professeur-sur-bacastages.md
//
// Parcours sans compte : le lecteur n'en a pas encore. Le formulaire est rempli
// jusqu'au dernier écran et **jamais soumis**, pour ne pas créer de compte dans la
// base de démo.
//
// L'identité saisie est fictive et son adresse est au domaine de démo, qui ne délivre
// rien. Le lycée cherché est celui de l'univers de démo, dont l'UAI commence par
// 999000.
//
// Même parcours que celui du DDF, à une carte près : c'est « Professeur encadrant »
// qui est choisi à l'écran des fonctions, et l'article s'arrête à la validation,
// l'e-mail de confirmation n'étant pas capturable ici.

import { BASE_URL, settle, withPublicPage } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/1-creer-un-compte-professeur-sur-bacastages';

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
  const prof = page.getByText('Remplir vos comptes-rendus, suivre les informations relatives à vos mini-stages');
  await shoot.screen('3-choisir-professeur-encadrant', [
    [3, prof],
    [4, page.getByRole('button', { name: 'Continuer' })],
  ]);

  await prof.click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  await page.fill('#su-last', 'Dubreuil');
  await page.fill('#su-first', 'Hélène');
  await page.fill('#su-phone', '0612345678');
  await settle(page);
  await shoot.screen('4-votre-identite', [
    [5, page.locator('#su-last')],
    [5, page.locator('#su-first')],
    [5, page.locator('#su-phone')],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  await page.fill('#su-email', 'helene.dubreuil@demo.bacastages.fr');
  await page.fill('#su-pwd', 'Mini-Stages-2026!');
  await page.fill('#su-pwd2', 'Mini-Stages-2026!');
  await settle(page);
  await shoot.screen('5-vos-identifiants', [
    [6, page.locator('#su-email')],
    [7, page.locator('#su-pwd')],
    [8, page.locator('#su-pwd2')],
  ]);

  await page.getByRole('button', { name: 'Continuer' }).click();
  await settle(page);
  const search = page.getByPlaceholder('Rechercher une école...');
  await search.click();
  // Le champ de cmdk ne rouvre sa liste qu'au fil des frappes : `fill` poserait la
  // valeur d'un coup, sans suggestion.
  await search.pressSequentially("Val d'Arnon", { delay: 60 });
  const resultat = page.locator('[cmdk-item]').filter({ hasText: "Lycée professionnel du Val d'Arnon" }).first();
  await resultat.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('6-rattacher-votre-etablissement', [
    [9, search],
    [9, resultat],
  ]);

  await resultat.click();
  const consent = page.locator('label').filter({ hasText: "J'accepte les conditions" });
  await consent.click();
  await settle(page);
  await shoot.screen('7-valider-l-inscription', [
    [10, page.getByRole('button', { name: 'Créer mon compte' })],
  ]);
});
