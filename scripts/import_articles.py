#!/usr/bin/env python3
"""Transforme un export Intercom (intercom_export.py help-center) en fichiers Markdown.

    python3 scripts/import_articles.py <dossier-export> <préfixe-id>

Produit, à la racine du dépôt :
- `collections.yml` : l'arborescence des collections ;
- `articles/<collection>/<slug>.md` : un fichier par article, métadonnées en en-tête ;
- `assets/<slug>/` : les images, téléchargées localement.

Les URL d'images Intercom sont signées et expirent : elles doivent être rapatriées
pendant que l'export est frais, sinon les articles perdent leurs captures.

`<préfixe-id>` nomme le champ d'identifiant écrit en en-tête (`intercom_us_id`) : il
permet de retrouver l'article d'origine sans le confondre avec celui du futur espace.
"""

import html
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE = re.compile(r"!\[([^\]]*)\]\((https://downloads\.intercomcdn\.com/[^)\s]+)\)")
HEADING_ANCHOR = re.compile(r"\s*\{#h_[0-9a-f]+\}")


def slugify(text):
    text = unicodedata.normalize("NFKD", html.unescape(text)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80]


def yaml_str(value):
    return json.dumps(value, ensure_ascii=False)


def collection_paths(collections):
    by_id = {c["id"]: c for c in collections}

    def path(cid):
        c = by_id[cid]
        own = slugify(c["name"])
        return f"{path(c['parent_id'])}/{own}" if c.get("parent_id") else own

    return {cid: path(cid) for cid in by_id}


def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=60) as res:
        target.write_bytes(res.read())


def localize_images(markdown, slug):
    def replace(match):
        alt, url = match.groups()
        # /i/o/<workspace>/<image-id>/<hash>/<nom>.<ext>
        parts = url.split("?")[0].split("/")
        name = f"{parts[6]}{Path(parts[-1]).suffix or '.png'}"
        target = ROOT / "assets" / slug / name
        if not target.exists():
            download(url, target)
        # Intercom laisse parfois du HTML dans le texte alternatif : il n'a aucun sens hors de l'éditeur.
        if "<" in alt:
            alt = ""
        return f"![{alt}](../{'../' * slug.count('/')}assets/{slug}/{name})"

    return IMAGE.sub(replace, markdown)


def main(export_dir, id_prefix):
    collections = json.loads((export_dir / "collections.json").read_text())
    articles = json.loads((export_dir / "articles.json").read_text())
    paths = collection_paths(collections)

    lines = []
    for c in sorted(collections, key=lambda c: paths[c["id"]]):
        lines += [
            f"- path: {paths[c['id']]}",
            f"  name: {yaml_str(html.unescape(c['name']))}",
            f"  description: {yaml_str(html.unescape(c.get('description') or ''))}",
            f"  parent: {paths[c['parent_id']] if c.get('parent_id') else 'null'}",
            f"  order: {c.get('order', 'null')}",
            f"  {id_prefix}_id: {yaml_str(c['id'])}",
        ]
    (ROOT / "collections.yml").write_text("\n".join(lines) + "\n")

    written, skipped, slugs = 0, [], set()
    for a in articles:
        body = a.get("body_markdown") or ""
        if not body.strip():
            skipped.append(a["title"])
            continue
        parent_ids = [str(p) for p in a.get("parent_ids") or []]
        folder = paths.get(parent_ids[0], "sans-collection") if parent_ids else "sans-collection"
        slug = f"{folder}/{slugify(a['title'])}"
        # Deux articles peuvent porter le même titre : l'identifiant les départage.
        if slug in slugs:
            slug = f"{slug}-{a['id']}"
        slugs.add(slug)
        body = localize_images(HEADING_ANCHOR.sub("", body), slug)

        front = [
            "---",
            f"title: {yaml_str(a['title'])}",
            f"description: {yaml_str(a.get('description') or '')}",
            f"state: {a['state']}",
            f"collections: [{', '.join(paths[p] for p in parent_ids if p in paths)}]",
            f"{id_prefix}_id: {yaml_str(a['id'])}",
            f"{id_prefix}_url: {yaml_str(a.get('url') or '')}",
            f"{id_prefix}_updated_at: {a['updated_at']}",
            "---",
            "",
        ]
        target = ROOT / "articles" / f"{slug}.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(front) + body.rstrip() + "\n")
        written += 1

    print(f"{written} articles écrits, {len(skipped)} ignorés (corps vide) : {skipped}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).expanduser(), sys.argv[2])
