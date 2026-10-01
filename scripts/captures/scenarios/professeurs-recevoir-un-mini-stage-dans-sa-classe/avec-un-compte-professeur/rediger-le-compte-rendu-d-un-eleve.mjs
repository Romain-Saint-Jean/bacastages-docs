// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/rediger-le-compte-rendu-d-un-eleve.md
//
// Le formulaire est rempli mais **jamais enregistré** : la démo doit garder ses
// comptes rendus tels que le seed les a posés. Remplir avant de capturer est
// volontaire — une capture d'un formulaire vide montre des champs, pas ce qu'on y met,
// et c'est le passage du badge « Satisfaction manquante » à « Appréciation
// conseillée » que l'article décrit.
//
// Emma Blanchard n'a pas de compte rendu sur le mini-stage du 10 septembre : c'est le
// seul état où le bouton dit « Rédiger le compte rendu » et non « Voir / modifier ».

import { BASE_URL, bringIntoView, pinMenu, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/rediger-le-compte-rendu-d-un-eleve';

await withSession('julien.moreau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/prof-ministages`);
  await settle(page);
  await pinMenu(page);

  const session = page.getByRole('row').filter({ hasText: 'jeudi 10 septembre 2026' }).first();
  await session.waitFor({ timeout: 20_000 });
  await session.getByRole('cell').first().click();
  const eleve = page.getByRole('row').filter({ hasText: 'Emma Blanchard' });
  await eleve.waitFor({ timeout: 20_000 });
  await eleve.getByText('Emma Blanchard').click();

  const detail = page.getByRole('dialog').filter({ hasText: "Détail de l'élève" });
  await detail.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-ouvrir-le-compte-rendu', [
    [4, detail.getByRole('button', { name: 'Rédiger le compte rendu' })],
  ]);

  await detail.getByRole('button', { name: 'Rédiger le compte rendu' }).click();
  const form = page.getByRole('dialog').filter({ hasText: 'Compte rendu de mini-stage' });
  await form.waitFor({ timeout: 20_000 });
  await settle(page);

  await shoot.screen('2-la-satisfaction-globale', [
    [5, form.getByText('Satisfaction globale')],
  ]);

  await form.getByRole('button', { name: 'Favorable', exact: true }).click();
  await form.getByRole('textbox').first().fill(
    "Emma a suivi l'atelier avec attention et posé de bonnes questions sur le diagnostic électronique.",
  );
  await settle(page);
  await shoot.screen('3-votre-appreciation', [
    [6, form.getByText('Votre appréciation')],
  ]);

  // Deux captures et non une : les deux sections ne tiennent pas ensemble dans un
  // écran de 1050 px, et la garde de `boxOf` refuse la seconde cible.
  const ponctualite = form.getByText('Ponctualité', { exact: true }).first();
  await bringIntoView(ponctualite);
  await settle(page);
  await shoot.screen('4-la-ponctualite', [[7, ponctualite]]);

  const criteres = form.getByText('Évaluation détaillée');
  await bringIntoView(criteres);
  await settle(page);
  await shoot.screen('5-les-neuf-criteres', [[8, criteres]]);

  const enregistrer = form.getByRole('button', { name: 'Enregistrer', exact: true });
  await bringIntoView(enregistrer);
  await settle(page);
  await shoot.screen('6-enregistrer', [[9, enregistrer]]);
});
