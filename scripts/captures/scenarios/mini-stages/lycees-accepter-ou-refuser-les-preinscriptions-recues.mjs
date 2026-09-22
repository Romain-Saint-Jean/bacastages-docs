// Captures de articles/mini-stages/lycees-accepter-ou-refuser-les-preinscriptions-recues.md
//
// La fenêtre de refus s'ouvre mais ne se confirme jamais : la démo doit rester dans
// l'état que décrit `scripts/captures/README.md`, et un refus posé ici viderait
// l'onglet « À traiter » des captures suivantes.
//
// Le retour sur un refus se montre sur Gabriel Roy, refusé par le lycée alors que le
// collège n'a pas tranché. Léna Vasseur, refusée par le collège, est sur la même liste
// sans aucun bouton : c'est elle qui prouve que le retour n'appartient qu'à celui qui
// a refusé.

import { BASE_URL, pinMenu, settle, unpinMenu, withSession } from '../../lib.mjs';

const ARTICLE = 'mini-stages/lycees-accepter-ou-refuser-les-preinscriptions-recues';

await withSession('philippe.rousseau', ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await pinMenu(page);

  const table = page.getByRole('table').first();
  const attente = table.getByText('En attente de décision').first();
  await attente.waitFor({ timeout: 20_000 });

  await shoot.screen('1-les-dossiers-a-decider', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
    [2, page.getByRole('radio', { name: 'Stages chez nous' })],
    [3, page.getByRole('tab', { name: /^À traiter/ })],
    [3, attente],
  ]);

  // Le tiroir : c'est lui qui porte l'établissement d'origine, la classe et le
  // responsable légal que l'article demande de vérifier avant de décider.
  await page.getByRole('button', { name: 'Voir le détail du dossier de Timéo Barbier' }).click();
  const tiroir = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  await tiroir.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('2-ouvrir-le-dossier', [[4, tiroir.getByText('Avancement du dossier')]]);

  await page.getByRole('button', { name: 'Fermer' }).last().click().catch(() => {});
  await page.keyboard.press('Escape');
  await settle(page);

  const ligne = page.getByRole('row').filter({ hasText: 'Timéo Barbier' });
  await shoot.screen('3-accepter-ou-refuser', [
    [5, ligne.getByRole('button', { name: 'Accepter' })],
    [6, ligne.getByRole('button', { name: 'Refuser' })],
  ]);

  await ligne.getByRole('button', { name: 'Refuser' }).click();
  const refus = page.getByRole('dialog').filter({ hasText: 'Confirmer le refus' });
  await refus.waitFor({ timeout: 20_000 });
  await settle(page);
  await shoot.screen('4-le-motif-du-refus', [
    [7, refus.getByText('Motif du refus (optionnel)')],
    [8, refus.getByRole('button', { name: 'Confirmer le refus' })],
  ]);

  // Rien n'est confirmé : la fenêtre se referme par « Annuler ».
  await refus.getByRole('button', { name: 'Annuler' }).click();
  await settle(page);

  await page.getByRole('tab', { name: /^Sans suite/ }).click();
  await settle(page);
  // La barre épinglée coûte 190 px et une ligne du tableau en mesure 1454 : sans ce
  // repli, la ligne déborde à droite et la garde de `boxOf` refuse la capture.
  await unpinMenu(page);
  await settle(page);
  // `shoot` et non `shoot.screen` : « Revenir sur un refus » est une section sans
  // numéro d'étape, et un encadré numéroté renverrait à une étape qui n'existe pas.
  // Le recadrage sur les deux lignes oppose le dossier que le lycée a refusé, qui
  // porte le bouton, à celui que le collège a refusé, qui n'en a aucun.
  //
  // Le cadrage porte sur les cellules et non sur les lignes : la table a une largeur
  // minimale de 1454 px posée à 248 px du bord, si bien que la ligne déborde de 22 px
  // alors que tout son contenu est à l'écran. Viser les cellules donne le même
  // rectangle, sans le vide de fin que la garde refuse à juste titre.
  const refuseParNous = page.getByRole('row').filter({ hasText: 'Gabriel Roy' });
  const refuseParEux = page.getByRole('row').filter({ hasText: 'Léna Vasseur' });
  const retour = refuseParNous.getByRole('button', { name: 'Revenir sur le refus' });
  await retour.waitFor({ timeout: 20_000 });
  await shoot(
    '5-revenir-sur-le-refus',
    [
      refuseParNous.getByRole('cell').first(),
      refuseParNous.getByRole('cell').last(),
      refuseParEux.getByRole('cell').first(),
      refuseParEux.getByRole('cell').last(),
    ],
    { highlights: [retour] },
  );
});
