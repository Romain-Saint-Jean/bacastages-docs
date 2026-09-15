// Convertit un article Markdown du dépôt en HTML pour l'API Intercom.
//
//   node scripts/intercom_html.mjs articles/<collection>/<article>.md
//
// On n'envoie pas `body_markdown` : le convertisseur d'Intercom supprime les images placées
// dans une étape numérotée, et une image laissée hors de la liste la coupe, ce qui fait
// repartir la numérotation à 1. On produit donc le HTML nous-mêmes, dans la forme
// qu'écrit l'éditeur d'Intercom : l'image dans un `<div class="intercom-container">`.
//
// Les images pointent vers leur URL publique sur GitHub : Intercom les télécharge à
// l'enregistrement de l'article et les sert ensuite depuis ses propres serveurs. Elles
// viennent de `main`, ou de la branche `DOCS_REF` pour essayer des captures avant de
// les fusionner.

import { marked } from 'marked';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_BASE = `https://raw.githubusercontent.com/Romain-Saint-Jean/bacastages-docs/${process.env.DOCS_REF ?? 'main'}/`;

export async function articleToIntercom(file) {
  const source = await readFile(file, 'utf8');
  const [, front, markdown] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta = Object.fromEntries(
    [...front.matchAll(/^(\w+): (.*)$/gm)].map(([, key, value]) => [key, value.startsWith('"') ? JSON.parse(value) : value]),
  );

  const withoutComments = markdown.replace(/<!--[\s\S]*?-->\n?/g, '');
  const withPublicImages = withoutComments.replace(/!\[([^\]]*)\]\(((?:\.\.\/)+assets\/[^)]+)\)/g, (_, alt, relative) => {
    const fromRoot = path.relative(ROOT, path.resolve(path.dirname(file), relative)).split(path.sep).join('/');
    return `![${alt}](${RAW_BASE}${fromRoot})`;
  });

  const html = marked
    .parse(withPublicImages)
    .replace(/<p>\s*(<img [^>]+>)\s*<\/p>/g, '<div class="intercom-container">$1</div>')
    .replace(/(<li>[^<]*?)(<img [^>]+>)/g, '$1<div class="intercom-container">$2</div>');

  return { meta, html };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage : node scripts/intercom_html.mjs articles/<collection>/<article>.md');
    process.exit(1);
  }
  const { html } = await articleToIntercom(path.resolve(file));
  process.stdout.write(html);
}
