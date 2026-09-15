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

  // Le tableau déborde de l'écran : on s'arrête à la colonne « Action requise ».
  const table = page.getByRole('table').first();
  const student = table.getByText('Chloé Dubois').first();
  await student.waitFor();
  await settle(page);
  await shoot(
    '1-ouvrir-le-dossier',
    [
      table.getByRole('columnheader', { name: /nom complet/i }),
      table.getByText('En attente des signataires').first(),
      table.getByText('Classe : 3e').first(),
    ],
    { highlights: [student], padding: 20 },
  );

  await student.click();
  const drawer = page.getByRole('dialog').filter({ hasText: 'Avancement du dossier' });
  const download = drawer.getByRole('button', { name: 'Télécharger la convention vierge' });
  await download.waitFor();
  await settle(page);
  await shoot('2-telecharger-la-convention-vierge', [drawer.getByText('Convention transmise').first(), download], {
    highlights: [download],
  });

  const deposit = drawer.getByRole('button', { name: 'Déposer la convention signée' });
  await deposit.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot('3-deposer-la-convention-signee', [drawer.getByText('Gestion de la convention').first(), deposit], {
    highlights: [deposit],
  });

  await deposit.click();
  const dialog = page.getByRole('dialog', { name: 'Déposer la convention signée' });
  await dialog.waitFor();
  await page.getByLabel('Votre nom complet (Personne déposant la convention)').fill('Véronique Blanc');
  // Un fichier choisi, jamais envoyé : la capture montre le champ rempli.
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'convention-chloe-dubois.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF\n'),
  });
  await settle(page);
  await shoot('4-fenetre-de-depot', dialog, { padding: 0 });
});
