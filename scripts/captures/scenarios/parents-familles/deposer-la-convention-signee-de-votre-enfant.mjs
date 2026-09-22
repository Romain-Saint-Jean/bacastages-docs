// Captures de articles/parents-familles/deposer-la-convention-signee-de-votre-enfant.md
//
// ⚠️ **Article illustré en partie.** Le dépôt papier lui-même n'est pas atteignable depuis
// un compte famille de la démo. Les deux seuls enfants rattachés à un compte famille,
// Léa Martin (`celine.martin`) et Yanis Haddad, élève majeur, ont l'un et l'autre une
// convention partie en signature électronique. Leur tiroir remplace le bouton de dépôt par
// « La convention se signe en ligne : ouvrez "À signer" pour la signer. » Les quatre
// écrans du dépôt (fenêtre, nom du déposant, fichier, envoi) sont illustrés dans
// `conventions/ou-deposer-la-convention-signee`, vus du Compte Inscription du collège.
//
// Ce que ce scénario montre, et qui est vrai pour toutes les familles : où vit la
// convention (dans le dossier de l'enfant, sous « Suivi ») et le bouton de
// téléchargement de la convention vierge, présent quel que soit le mode de signature.

import { BASE_URL, settle, withSession } from '../../lib.mjs';

const ARTICLE = 'parents-familles/deposer-la-convention-signee-de-votre-enfant';

await withSession('celine.martin', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await page.getByRole('tab', { name: /^Toutes/ }).click();
  await settle(page);
  const table = page.getByRole('table').first();
  const dossier = table.getByText('Convention transmise').first();
  await dossier.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('1-ouvrir-le-dossier-de-votre-enfant', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
    [2, dossier],
  ]);

  await dossier.click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  const telecharger = tiroir.getByRole('button', { name: 'Télécharger la convention vierge' });
  await telecharger.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('2-telecharger-la-convention-vierge', [[3, telecharger]]);

  // Le cas « vous ne voyez pas le bouton de dépôt » : la convention part en signature
  // électronique, et l'écran le dit de lui-même.
  await shoot.screen('3-la-convention-se-signe-en-ligne', [
    [4, tiroir.getByText('La convention se signe en ligne', { exact: false }).first()],
  ]);
});
