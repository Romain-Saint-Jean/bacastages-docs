// Captures de articles/parents-familles/decouvrir-et-rechercher-des-mini-stages.md
//
// Vu par une famille connectée : `celine.martin`, mère de Léa. La recherche d'offres est
// le premier écran du persona famille, et le seul où elle choisit quelque chose.
//
// Deux écarts relevés à la capture, corrigés dans l'article :
// - le champ de recherche par texte porte le libellé « Métier », et il est le premier
//   contrôle de la barre, quand l'article le renvoyait en fin de page sans le nommer ;
// - la fiche d'une offre ne porte pas de bouton « Retour aux offres ». Ce libellé n'existe
//   que sur l'écran d'erreur (`announcementDetailClient.tsx`) ; le retour se fait par un
//   fil d'Ariane « Retour » / « Toutes les offres ».

import { BASE_URL, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'parents-familles/decouvrir-et-rechercher-des-mini-stages';

await withSession('celine.martin', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/announcements`);
  await settle(page);
  await shoot.screen('1-ouvrir-toutes-les-offres', [
    [1, page.getByRole('link', { name: 'Toutes les offres' }).first()],
  ]);

  const domaine = page.getByRole('button', { name: /Domaine/ });
  const region = page.getByRole('button', { name: /Région/ });
  const dates = page.getByRole('button', { name: /Dates/ });
  const dispo = page.getByRole('button', { name: /Disponibilité/ });
  await settle(page);
  await shoot.screen('2-les-quatre-filtres-et-la-recherche', [
    [2, domaine],
    [3, region],
    [4, dates],
    [5, dispo],
    [6, page.getByPlaceholder('Rechercher un métier, une filière, un établissement…')],
  ]);

  // Le menu « Disponibilité » ouvert : c'est le seul filtre qui part d'une valeur choisie,
  // et l'article demande au lecteur de la changer. C'est une popover Radix, dont les deux
  // choix sont des `button` nus : on les vise dans le calque flottant, « Toutes les
  // offres » étant aussi le nom d'une rubrique de la navigation.
  await dispo.click();
  const menu = page.locator('[data-radix-popper-content-wrapper]');
  const toutes = menu.getByRole('button', { name: 'Toutes les offres' });
  await toutes.waitFor({ timeout: 10_000 });
  await settle(page);
  await shoot.screen('3-voir-aussi-les-creneaux-complets', [
    [5, menu.getByRole('button', { name: 'Places disponibles' })],
    [5, toutes],
  ]);
  await page.keyboard.press('Escape');
  await settle(page);

  // Cuisine et restauration, mardi J+10 : une offre avec sa salle, ses places restantes
  // et son bouton d'inscription.
  await page.goto(`${BASE_URL}/announcements/d0c5a000-0000-4000-8000-000000000311`);
  await settle(page);
  const encadre = page.getByText('places restantes').first();
  await encadre.waitFor({ timeout: 20_000 });
  await settle(page);
  // Les intitulés « DATE », « HORAIRE » et « LIEU » sont mis en capitales par la feuille de
  // style : leur texte réel est « Date », « Horaire », « Lieu », et `getByText` non exact
  // ignore la casse : « LIEU » attrapait « Visite des lieux ». On encadre donc l'encadré
  // entier, désigné par le plus petit bloc qui porte à la fois les places et l'inscription.
  const carte = page
    .locator('div')
    .filter({ has: page.getByText('places restantes') })
    .filter({ has: page.getByRole('link', { name: "S'inscrire" }) })
    .last();
  await shoot.screen('4-la-fiche-d-une-offre', [
    [7, encadre],
    [8, carte],
  ]);

  await shoot.screen('5-revenir-a-la-liste', [
    [9, page.getByRole('button', { name: 'Retour' }).first()],
    [9, page.getByRole('link', { name: 'Toutes les offres' }).last()],
  ]);
});
