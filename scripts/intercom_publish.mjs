// Pousse les articles du dépôt vers le Help Center Intercom.
//
//   INTERCOM_TOKEN=… node scripts/intercom_publish.mjs [options] [chemins…]
//
//   --dry-run              n'écrit rien, dit ce qui partirait
//   --state <s>            published | draft | keep (par défaut : keep)
//   --only <motif>         ne traite que les chemins contenant ce motif
//
// Sans chemin, tous les articles de `articles/` partent. Un chemin peut être un fichier
// ou un dossier de collection.
//
// C'est le sens inverse de `intercom_export.py` : le dépôt est la source, Intercom la
// copie. Un article déjà connu est **mis à jour par son identifiant** (`intercom_us_id`),
// jamais recréé : son URL est citée dans des e-mails déjà envoyés. Un article sans
// identifiant est créé, et l'identifiant rendu par Intercom est réécrit dans son en-tête
// — le commit qui suit la publication fait donc partie de l'opération.
//
// Les images partent par leur URL publique sur GitHub (voir `intercom_html.mjs`) :
// elles doivent être sur `main`, ou sur la branche nommée par `DOCS_REF`, avant la
// publication. Intercom les recopie sur son CDN à l'enregistrement.

import { readFile, writeFile } from 'node:fs/promises';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleToIntercom } from './intercom_html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.intercom.io';
const VERSION = '2.16';
const AUTHOR_ID = Number(process.env.INTERCOM_AUTHOR_ID ?? 8958862);

const token = process.env.INTERCOM_TOKEN;
if (!token) {
  console.error('INTERCOM_TOKEN manquant. Le charger sans l\'afficher :');
  console.error('  set -a; . ~/.config/bacastages/intercom-us.env; set +a');
  console.error('  export INTERCOM_TOKEN="$INTERCOM_US_TOKEN"');
  process.exit(1);
}

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const state = value('--state') ?? 'keep';
const only = value('--only');
const targets = argv.filter((a) => !a.startsWith('--') && !['published', 'draft', 'keep'].includes(a) && a !== only);

if (!['published', 'draft', 'keep'].includes(state)) {
  console.error(`--state attend published, draft ou keep, pas « ${state} »`);
  process.exit(1);
}

function value(flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

async function request(method, route, body) {
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(`${API}${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Intercom-Version': VERSION,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json();
    const text = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === 4) throw new Error(`${method} ${route} → ${res.status} ${text.slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

// collections.yml est une liste plate de blocs `- path: …` : un analyseur complet de YAML
// serait une dépendance pour rien.
async function collections() {
  const source = await readFile(path.join(ROOT, 'collections.yml'), 'utf8');
  const byPath = new Map();
  for (const block of source.split(/^- /m).slice(1)) {
    const field = (name) => block.match(new RegExp(`^ *${name}: (.*)$`, 'm'))?.[1]?.replace(/^"|"$/g, '');
    byPath.set(field('path'), { name: field('name'), id: field('intercom_us_id') });
  }
  return byPath;
}

async function articleFiles() {
  const roots = targets.length ? targets : ['articles'];
  const files = [];
  for (const entry of roots) {
    const full = path.resolve(ROOT, entry);
    if ((await stat(full)).isDirectory()) {
      for (const child of await readdir(full, { recursive: true })) {
        if (child.endsWith('.md')) files.push(path.join(full, child));
      }
    } else {
      files.push(full);
    }
  }
  const kept = files.filter((f) => !only || f.includes(only));
  return kept.sort();
}

// Réécrit une clé de l'en-tête, ou l'ajoute avant le `---` de fermeture si elle manque.
function withFrontMatter(source, updates) {
  const end = source.indexOf('\n---\n', 4);
  let front = source.slice(4, end);
  let rest = source.slice(end + 5);
  const bare = new Set(['state', 'intercom_us_updated_at']);
  for (const [key, raw] of Object.entries(updates)) {
    const line = `${key}: ${typeof raw === 'number' || bare.has(key) ? raw : JSON.stringify(raw)}`;
    const existing = new RegExp(`^${key}: .*$`, 'm');
    front = existing.test(front) ? front.replace(existing, line) : `${front}\n${line}`;
  }
  return `---\n${front}\n---\n${rest}`;
}

const byPath = await collections();
const files = await articleFiles();
const report = { updated: [], created: [], failed: [], published: 0 };

for (const file of files) {
  const relative = path.relative(ROOT, file);
  const collectionPath = path.dirname(path.relative(path.join(ROOT, 'articles'), file)).split(path.sep).join('/');
  const collection = byPath.get(collectionPath);
  if (!collection) {
    report.failed.push([relative, `collection « ${collectionPath} » absente de collections.yml`]);
    continue;
  }

  const { meta, html } = await articleToIntercom(file);
  const wanted = state === 'keep' ? (meta.state ?? 'draft') : state;
  const payload = {
    title: meta.title,
    description: meta.description ?? '',
    body: html,
    author_id: AUTHOR_ID,
    state: wanted,
    parent_id: Number(collection.id),
    parent_type: 'collection',
  };

  const id = meta.intercom_us_id;
  if (dryRun) {
    console.log(`${id ? 'mise à jour' : 'CRÉATION  '} ${relative} → ${collection.name} [${wanted}]`);
    (id ? report.updated : report.created).push(relative);
    if (wanted === 'published') report.published += 1;
    continue;
  }

  try {
    const article = id
      ? await request('PUT', `/articles/${id}`, payload)
      : await request('POST', '/articles', payload);
    const source = await readFile(file, 'utf8');
    await writeFile(
      file,
      withFrontMatter(source, {
        state: article.state,
        intercom_us_id: String(article.id),
        intercom_us_url: article.url ?? '',
        intercom_us_updated_at: article.updated_at,
      }),
    );
    (id ? report.updated : report.created).push(relative);
    if (article.state === 'published') report.published += 1;
    console.log(`${id ? 'mis à jour' : 'créé     '} ${article.id} ${relative} [${article.state}]`);
  } catch (error) {
    report.failed.push([relative, error.message]);
    console.error(`ÉCHEC      ${relative} : ${error.message}`);
  }
}

console.log(
  `\n${report.updated.length} mis à jour, ${report.created.length} créés, ` +
    `${report.published} publiés, ${report.failed.length} en échec.`,
);
for (const [file, reason] of report.failed) console.log(`  échec : ${file} : ${reason}`);
process.exit(report.failed.length ? 1 : 0);
