// Captures de articles/conventions/ou-deposer-la-convention-signee.md
//
// Vu par le Compte Inscriptions du collège d'origine : c'est lui, avec les familles, qui
// dépose les conventions papier. Chloé Dubois est l'élève dont la convention attend son
// dépôt dans les données de démo.

import { BASE_URL, settle, withSession } from '../../lib.mjs';

await withSession('veronique.blanc', 'conventions/ou-deposer-la-convention-signee', async ({ page, shoot }) => {
  await page.goto(`${BASE_URL}/suivi`);
  await settle(page);
  await page.getByRole('tab', { name: /^Toutes/ }).click();
  await page.getByPlaceholder('Rechercher…').fill('Dubois');

  // Les numéros des encadrés sont ceux des étapes de l'article.
  const table = page.getByRole('table').first();
  const student = table.getByText('Chloé Dubois').first();
  await student.waitFor();
  await settle(page);
  await shoot.screen('1-ouvrir-le-dossier', [
    [1, page.getByRole('link', { name: 'Suivi', exact: true })],
    [2, student],
  ]);

  await student.click();
  const drawer = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  const download = drawer.getByRole('button', { name: 'Télécharger la convention vierge' });
  await download.waitFor();
  await settle(page);
  await shoot.screen('2-telecharger-la-convention-vierge', [[3, download]]);

  const deposit = drawer.getByRole('button', { name: 'Déposer la convention signée' });
  await deposit.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('3-deposer-la-convention-signee', [
    [1, drawer.getByText('Gestion de la convention').first()],
    [2, deposit],
  ]);

  await deposit.click();
  const dialog = page.getByRole('dialog', { name: 'Déposer la convention signée' });
  await dialog.waitFor();
  const name = page.getByLabel('Votre nom complet (Personne déposant la convention)');
  await name.fill('Véronique Blanc');
  // Un fichier choisi, jamais envoyé : la capture montre le champ rempli.
  const file = dialog.locator('input[type=file]');
  await file.setInputFiles({
    name: 'convention-chloe-dubois.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
  });
  await settle(page);
  await shoot.screen('4-fenetre-de-depot', [
    [3, name],
    [4, file],
    [5, dialog.getByRole('button', { name: 'Déposer', exact: true })],
  ]);
});
