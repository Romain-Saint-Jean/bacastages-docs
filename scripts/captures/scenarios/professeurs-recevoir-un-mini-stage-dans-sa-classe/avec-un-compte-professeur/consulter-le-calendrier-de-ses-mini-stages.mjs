// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/consulter-le-calendrier-de-ses-mini-stages.md
//
// Le calendrier ne modifie rien : le scénario se contente de naviguer.
//
// La semaine en cours porte le mini-stage du jour.

import { BASE_URL, pinMenu, settle, withSession } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/avec-un-compte-professeur/consulter-le-calendrier-de-ses-mini-stages';

await withSession('julien.moreau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/calendar`);
  await settle(page);
  await pinMenu(page);

  await shoot.screen('1-ouvrir-le-calendrier', [
    [1, page.getByRole('link', { name: 'Calendrier', exact: true })],
  ]);

  await shoot.screen('2-naviguer-de-semaine-en-semaine', [
    [3, page.getByRole('button', { name: /semaine précédente/i })],
    [3, page.getByRole('button', { name: /semaine suivante/i })],
    [4, page.getByRole('button', { name: "Aujourd'hui", exact: true })],
  ]);

  // L'étape 5, « ouvrir le détail d'un créneau », n'est pas illustrée : la fenêtre de
  // détail annonce une date fausse. Le mini-stage du mardi 22 septembre, que le Suivi
  // et « Mes offres » datent bien, est posé sous LUN. 21 dans la grille et titré
  // « Lundi 21 Septembre 2026 » dans sa fenêtre. Même cause que le raccourci
  // « Aujourd'hui » du Suivi : la date est stockée à minuit de Paris, soit 22:00 UTC
  // la veille, et cet écran lit le jour UTC. Défaut remonté ; la capture attendra le
  // correctif plutôt que d'apprendre une date fausse au lecteur.
});
