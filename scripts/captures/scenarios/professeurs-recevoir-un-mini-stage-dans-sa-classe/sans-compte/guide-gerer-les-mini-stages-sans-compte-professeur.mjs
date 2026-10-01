// Captures de articles/professeurs-recevoir-un-mini-stage-dans-sa-classe/sans-compte/guide-gerer-les-mini-stages-sans-compte-professeur.md
//
// Le seul écran du Help Center qui s'atteint par un jeton : le lien d'accès personnel
// d'un professeur. Le jeton ne peut pas vivre dans ce dépôt, qui est public, et il
// n'est lisible nulle part après coup — `SendProfessorAccessLinkUseCase` ne le pose
// que dans l'e-mail. Il se passe donc par l'environnement, et le scénario s'arrête
// proprement sans lui. Pour en fabriquer un sur la démo :
//
//   cd <worktree>/back  # un script jetable, supprimé après usage
//   container.resolve(AnonymousTokenService).generateProfessorLinkToken({
//     professorId, professorEmail, schoolId: `${uai}-${siteId}`, tokenVersion
//   })
//   CAPTURES_PROF_LINK_TOKEN=<jeton> node scripts/captures/scenarios/.../<ce fichier>
//
// `tokenVersion` se lit dans `professors.token_version` : le reprendre tel quel évite
// d'invalider les liens déjà envoyés, ce que fait l'envoi d'un nouveau lien.
//
// Rien n'est pointé ni enregistré : les boutons sont montrés, pas actionnés.

import { BASE_URL, settle, withPublicPage } from '../../../lib.mjs';

const ARTICLE = 'professeurs-recevoir-un-mini-stage-dans-sa-classe/sans-compte/guide-gerer-les-mini-stages-sans-compte-professeur';
const TOKEN = process.env.CAPTURES_PROF_LINK_TOKEN;

if (!TOKEN) {
  console.log(`${ARTICLE} : CAPTURES_PROF_LINK_TOKEN absent, captures non produites.`);
  process.exit(0);
}

await withPublicPage(ARTICLE, async ({ page, shoot }) => {
  // Les numéros des encadrés sont ceux des étapes de l'article.
  await page.goto(`${BASE_URL}/prof-link?token=${TOKEN}`);
  await settle(page);

  await shoot.screen('1-ouvrir-le-lien', [
    [1, page.getByRole('heading', { name: 'Gestion des mini-stages' })],
    [2, page.getByText('Emma Blanchard').first()],
  ]);

  // Le pointage et le compte rendu vivent sur la ligne de l'élève : cet écran n'a pas
  // de panneau de détail, contrairement à celui d'un professeur connecté.
  const ligne = page.locator('li, div').filter({ hasText: 'Emma Blanchard' }).last();
  const absent = page.getByRole('button', { name: 'Absent' }).first();
  const compteRendu = page.getByRole('button', { name: /compte rendu/i }).first();
  await absent.waitFor({ timeout: 20_000 });
  await shoot.screen('2-pointer-et-ouvrir-le-compte-rendu', [
    [4, absent],
    [5, compteRendu],
  ]);

  await compteRendu.click();
  await settle(page);
  const satisfaction = page.getByText('Satisfaction globale').first();
  await satisfaction.waitFor({ timeout: 20_000 });
  await satisfaction.scrollIntoViewIfNeeded();
  await settle(page);
  await shoot.screen('3-remplir-le-compte-rendu', [[6, satisfaction]]);
});
