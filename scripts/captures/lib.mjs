// Outils communs des scénarios de captures.
//
// Chaque scénario ouvre une session sur un compte de démo et parcourt l'écran. Deux formes
// de capture :
//
// - `shoot.screen` montre l'écran entier, menu compris, avec un encadré numéroté par
//   action : le lecteur situe l'action dans la page. C'est la forme par défaut.
// - `shoot` recadre sur quelques éléments, pour un détail que l'écran entier rendrait
//   illisible : un article Intercom fait environ 700 px de large.
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

export async function withSession(account, article, scenario, options = {}) {
  return browse(article, scenario, { ...options, account });
}

// Les écrans qu'on atteint sans compte : création de compte, mot de passe oublié.
// L'article les décrit du point de vue de quelqu'un qui n'en a pas encore.
export async function withPublicPage(article, scenario) {
  return browse(article, scenario, { account: null });
}

async function browse(article, scenario, { account, onboarding = 'collapsed', height = 1050 }) {
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
      // En dessous de 1680 px, le menu du haut tronque ses libellés (« S… » pour Suivi).
      //
      // La hauteur, elle, se relève au besoin : le panneau de mise en place est ancré en
      // bas à gauche et mesure près de 360 px, si bien qu'à 1050 px il déborde sous le pli
      // et ses boutons n'ont pas de place à l'écran — `shoot.screen` ne peut alors rien
      // encadrer. Les articles qui le décrivent passent `{ height: 1400 }`.
      viewport: { width: 1680, height },
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
    if (account) {
      await login(page, account);
      if (onboarding === 'collapsed') await collapseOnboarding(page);
    }
    console.log(`${article}${account ? ` (${account})` : ' (sans compte)'}`);
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

// Le panneau de mise en place flotte en bas à gauche, par-dessus le contenu, tant que
// l'établissement a une étape en attente. Il masquerait la moitié des écrans à illustrer.
// On le replie — ce que fait aussi le lecteur — sauf pour les articles qui le décrivent,
// qui passent `{ onboarding: 'open' }`.
//
// Le repli est mémorisé par `localStorage` sous l'identifiant du compte connecté : le
// poser directement éviterait ce clic, mais l'identifiant n'est connu qu'après la
// connexion, et le panneau est déjà dessiné. Le clic est plus simple et plus sûr.
async function collapseOnboarding(page) {
  const close = page.getByRole('button', { name: 'Fermer la liste de mise en place' });
  await close.click({ timeout: 5_000 }).catch(() => {});
}

/**
 * Déplie et épingle la barre de navigation de gauche.
 *
 * Les comptes d'établissement ont une barre latérale repliée sur ses icônes : une
 * capture d'« ouvrir le Suivi » y montre un pictogramme sans nom, alors que l'article
 * dit « cliquez sur Suivi ». Le produit offre le dépliage par le bouton d'épinglage,
 * et le lecteur l'obtient aussi en survolant la barre. Les comptes famille, eux, ont
 * une navigation haute déjà libellée : le bouton n'y existe pas, et l'appel ne fait
 * rien.
 */
export async function pinMenu(page) {
  // À appeler une fois l'écran chargé : l'épinglage n'est pas mémorisé d'une
  // navigation à l'autre, et un appel posé avant le `goto` se perd.
  const pin = page.getByRole('button', { name: 'Épingler le menu déplié' });
  if (!(await pin.count())) return;
  await pin.click({ timeout: 5_000 });
  await page.waitForTimeout(400);
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

async function boxOf(name, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${name} : élément absent ou invisible`);
  return box;
}

async function save(buffer, article, name) {
  const file = path.join(ROOT, 'assets', article, `${name}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(file);
  console.log(`  ${path.relative(ROOT, file)}`);
}

function capturer(page, article) {
  // Capture le rectangle qui englobe `targets`, puis retire les encadrements posés pour elle.
  async function shoot(name, targets, { padding = 16, highlights = [] } = {}) {
    const locators = Array.isArray(targets) ? targets : [targets];
    await locators[0].scrollIntoViewIfNeeded();
    for (const locator of highlights) await highlight(locator);

    const boxes = [];
    for (const locator of locators) boxes.push(await boxOf(name, locator));
    const viewport = page.viewportSize();
    const left = Math.max(0, Math.min(...boxes.map((b) => b.x)) - padding);
    const top = Math.max(0, Math.min(...boxes.map((b) => b.y)) - padding);
    const right = Math.min(viewport.width, Math.max(...boxes.map((b) => b.x + b.width)) + padding);
    const bottom = Math.min(viewport.height, Math.max(...boxes.map((b) => b.y + b.height)) + padding);

    const buffer = await page.screenshot({ clip: { x: left, y: top, width: right - left, height: bottom - top } });
    await clearHighlights(page);
    await save(buffer, article, name);
  }

  // Capture l'écran entier, menu compris, et y dessine un encadré numéroté par élément de
  // `marks` : le lecteur voit où se trouve chaque action, et le numéro renvoie à l'étape
  // de l'article. Le reste de l'écran est légèrement assombri.
  //
  //   await shoot.screen('1-ouvrir-le-dossier', [[1, menuItem], [2, studentName]]);
  //
  // Les encadrés sont dessinés sur l'image, pas dans la page : ils ne décalent rien.
  shoot.screen = async function screen(name, marks, { dim = 0.12 } = {}) {
    const boxes = [];
    for (const [label, locator] of marks) boxes.push({ label, ...(await boxOf(name, locator)) });
    const { width, height } = page.viewportSize();
    const obstacles = await visibleContent(page);
    const buffer = await page.screenshot();
    const overlay = annotations(boxes, { width, height, dim, obstacles });
    await save(await sharp(buffer).composite([{ input: Buffer.from(overlay), top: 0, left: 0 }]).toBuffer(), article, name);
  };

  return shoot;
}

// Rectangles de tout ce qu'un numéro ne doit pas cacher : lignes de texte, icônes, champs.
// Les conteneurs n'en font pas partie : un numéro peut se poser sur un fond de carte.
async function visibleContent(page) {
  return page.evaluate(() => {
    const rects = [];
    const keep = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const style = getComputedStyle(node.parentElement);
      if (style.visibility === 'hidden' || style.opacity === '0') continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (keep(r)) rects.push(r);
    }
    for (const el of document.querySelectorAll('svg, img, input, select, textarea, button')) {
      const r = el.getBoundingClientRect();
      if (keep(r) && r.width < innerWidth / 2) rects.push(r);
    }
    return rects.map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  });
}

// SVG à la taille de la capture (double densité), coordonnées en pixels CSS.
function annotations(boxes, { width, height, dim, obstacles }) {
  const SCALE = 2;
  const GAP = 6; // entre l'élément et son encadré
  const STROKE = 4;
  const BADGE = 40;
  const TAIL = 10;

  const frames = boxes.map((b) => ({
    label: b.label,
    x: b.x - GAP,
    y: b.y - GAP,
    w: b.width + 2 * GAP,
    h: b.height + 2 * GAP,
  }));

  const holes = frames.map((f) => `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="10" fill="black"/>`).join('');
  const shade = dim
    ? `<mask id="spot"><rect width="${width}" height="${height}" fill="white"/>${holes}</mask>
       <rect width="${width}" height="${height}" fill="rgba(15,23,42,${dim})" mask="url(#spot)"/>`
    : '';

  const placed = [];
  const parts = frames.map((f) => {
    const frame = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="10" fill="none" stroke="${HIGHLIGHT}" stroke-width="${STROKE}"/>`;
    const badge = placeBadge(f, frames, placed, obstacles, { width, height, size: BADGE, tail: TAIL });
    placed.push(badge);
    return frame + drawBadge(badge, f.label, { size: BADGE, tail: TAIL });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${height * SCALE}" viewBox="0 0 ${width} ${height}">
    ${shade}${parts.join('')}
  </svg>`;
}

// Le numéro se pose à côté de son encadré, à la première place qui reste dans l'écran sans
// couvrir un autre encadré, un autre numéro ou du contenu (texte, icône, champ). Faute de
// place libre, il prend celle qui cache le moins.
function placeBadge(frame, frames, placed, obstacles, { width, height, size, tail }) {
  const out = size + tail;
  const nearStart = frame.x + Math.min(24, frame.w / 2 - size / 2);
  const nearEnd = frame.x + frame.w - Math.min(24, frame.w / 2 - size / 2) - size;
  const middle = frame.y + frame.h / 2 - size / 2;
  const candidates = [
    { side: 'left', x: frame.x - out, y: middle },
    { side: 'top', x: nearStart, y: frame.y - out },
    { side: 'right', x: frame.x + frame.w + tail, y: middle },
    { side: 'bottom', x: nearStart, y: frame.y + frame.h + tail },
    { side: 'top', x: nearEnd, y: frame.y - out },
    { side: 'bottom', x: nearEnd, y: frame.y + frame.h + tail },
  ];
  const area = (a, b) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inside = (o) => o.x >= frame.x && o.y >= frame.y && o.x + o.w <= frame.x + frame.w && o.y + o.h <= frame.y + frame.h;
  const others = [...frames.filter((f) => f !== frame), ...placed];

  const scored = candidates
    .map((c) => ({ ...c, w: size, h: size }))
    .filter((c) => c.x >= 0 && c.y >= 0 && c.x + size <= width && c.y + size <= height)
    .filter((c) => !others.some((o) => area(c, o) > 0))
    .map((c) => ({ ...c, hidden: obstacles.filter((o) => !inside(o)).reduce((sum, o) => sum + area(c, o), 0) }));
  const free = scored.find((c) => c.hidden === 0);
  const chosen = free ?? scored.sort((a, b) => a.hidden - b.hidden)[0];
  return chosen ?? { side: 'inside', x: frame.x + 8, y: frame.y + 8, w: size, h: size };
}

function drawBadge({ side, x, y }, label, { size, tail }) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = 9;
  const pointer = {
    top: `${cx - half},${y + size - 1} ${cx + half},${y + size - 1} ${cx},${y + size + tail}`,
    bottom: `${cx - half},${y + 1} ${cx + half},${y + 1} ${cx},${y - tail}`,
    left: `${x + size - 1},${cy - half} ${x + size - 1},${cy + half} ${x + size + tail},${cy}`,
    right: `${x + 1},${cy - half} ${x + 1},${cy + half} ${x - tail},${cy}`,
    inside: '',
  }[side];
  return `<polygon points="${pointer}" fill="${HIGHLIGHT}"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="8" fill="${HIGHLIGHT}"/>
    <text x="${cx}" y="${cy}" dy="0.36em" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="24" fill="white">${label}</text>`;
}
