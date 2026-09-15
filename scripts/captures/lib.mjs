// Outils communs des scénarios de captures.
//
// Chaque scénario ouvre une session sur un compte de démo, parcourt l'écran et appelle
// `shoot` sur les éléments à montrer. La capture est recadrée sur ces éléments, jamais
// sur la page entière : un article Intercom fait environ 700 px de large.
//
// Prérequis : `scripts/captures/seed-demo.sh` le jour même, puis `scripts/captures/env.sh start`.

import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const BASE_URL = process.env.CAPTURES_BASE_URL ?? 'http://localhost:3100';
const DEMO_DOMAIN = 'demo.bacastages.fr';
const DEMO_PASSWORD = 'Demo-Bacastages-2026';

// Rendu en double densité pour les écrans haute résolution, puis ramené à cette largeur.
const MAX_WIDTH = 1400;
const HIGHLIGHT = '#F97316';

// Outils de développement qui n'existent pas en production, et animations qui
// figeraient une capture à mi-course.
const HIDDEN_CSS = `
  nextjs-portal,
  .tsqd-open-btn-container,
  .fixed:has(> button[aria-label^="Intercom placeholder"]) { display: none !important; }
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
    caret-color: transparent !important;
  }
`;

export async function withSession(account, article, scenario) {
  // Les contrôles natifs du navigateur (« Choisir un fichier ») ne suivent pas `locale`.
  // Sous Linux, Chromium lit sa langue dans `LANGUAGE`, et seul le Chromium complet
  // l'applique : le shell headless par défaut reste en anglais malgré les mêmes réglages.
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--lang=fr-FR'],
    env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr' },
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
    });
    await context.addInitScript((css) => {
      const inject = () => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
      else inject();
    }, HIDDEN_CSS);

    const page = await context.newPage();
    await login(page, account);
    console.log(`${article} (${account})`);
    await scenario({ page, shoot: capturer(page, article) });
  } finally {
    await browser.close();
  }
}

async function login(page, account) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#login-email', `${account}@${DEMO_DOMAIN}`);
  await page.fill('#login-password', DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
}

export async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
}

export async function highlight(locator) {
  await locator.evaluate((el, color) => {
    el.dataset.captureHighlight = '';
    el.style.setProperty('outline', `3px solid ${color}`, 'important');
    el.style.setProperty('outline-offset', '3px', 'important');
  }, HIGHLIGHT);
}

async function clearHighlights(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-capture-highlight]')) {
      el.style.removeProperty('outline');
      el.style.removeProperty('outline-offset');
      delete el.dataset.captureHighlight;
    }
  });
}

function capturer(page, article) {
  // Capture le rectangle qui englobe `targets`, puis retire les encadrements posés pour elle.
  return async function shoot(name, targets, { padding = 16, highlights = [] } = {}) {
    const locators = Array.isArray(targets) ? targets : [targets];
    await locators[0].scrollIntoViewIfNeeded();
    for (const locator of highlights) await highlight(locator);

    const boxes = [];
    for (const locator of locators) {
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${name} : élément absent ou invisible`);
      boxes.push(box);
    }
    const viewport = page.viewportSize();
    const left = Math.max(0, Math.min(...boxes.map((b) => b.x)) - padding);
    const top = Math.max(0, Math.min(...boxes.map((b) => b.y)) - padding);
    const right = Math.min(viewport.width, Math.max(...boxes.map((b) => b.x + b.width)) + padding);
    const bottom = Math.min(viewport.height, Math.max(...boxes.map((b) => b.y + b.height)) + padding);

    const buffer = await page.screenshot({ clip: { x: left, y: top, width: right - left, height: bottom - top } });
    await clearHighlights(page);

    const file = path.join(ROOT, 'assets', article, `${name}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await sharp(buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toFile(file);
    console.log(`  ${path.relative(ROOT, file)}`);
  };
}
