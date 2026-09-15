#!/usr/bin/env python3
"""Exporte le contenu brut d'un espace Intercom : Help Center et conversations.

Le token se lit dans la variable INTERCOM_TOKEN, jamais en argument : un argument
apparaît dans la liste des processus et dans l'historique du shell.

    INTERCOM_TOKEN=... python3 scripts/intercom_export.py help-center <dossier>
    INTERCOM_TOKEN=... python3 scripts/intercom_export.py conversations <dossier>

Les conversations contiennent des données personnelles : le dossier de sortie doit
rester hors de tout dépôt.

L'export des conversations reprend là où il s'est arrêté : une conversation déjà
écrite sur disque n'est pas redemandée.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

API_BASE = os.environ.get("INTERCOM_API_BASE", "https://api.intercom.io")
# 2.16 est la première version à renvoyer `body_markdown` sur les articles.
API_VERSION = "2.16"


def request(method, path, body=None, version=API_VERSION):
    token = os.environ["INTERCOM_TOKEN"]
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(6):
        req = urllib.request.Request(
            API_BASE + path,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Intercom-Version": version,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code == 429 or err.code >= 500:
                reset = err.headers.get("X-RateLimit-Reset")
                wait = max(1, int(reset) - int(time.time())) if reset else 2 ** attempt
                time.sleep(min(wait, 60))
                continue
            raise
    raise RuntimeError(f"{method} {path} : abandon après plusieurs tentatives")


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))


def list_pages(path, key="data"):
    items, page = [], 1
    while True:
        sep = "&" if "?" in path else "?"
        res = request("GET", f"{path}{sep}per_page=100&page={page}")
        items.extend(res.get(key, []))
        if page >= (res.get("pages") or {}).get("total_pages", 1):
            return items
        page += 1


def export_help_center(out):
    write_json(out / "help_centers.json", request("GET", "/help_center/help_centers"))
    write_json(out / "collections.json", list_pages("/help_center/collections"))
    articles = list_pages("/articles")
    write_json(out / "articles.json", articles)
    try:
        internal = request("GET", "/internal_articles", version="Unstable")
        write_json(out / "internal_articles.json", internal)
    except urllib.error.HTTPError as err:
        print(f"articles internes indisponibles ({err.code})")
    print(f"{len(articles)} articles exportés")


def export_conversations(out):
    ids, cursor = [], None
    while True:
        pagination = {"per_page": 150}
        if cursor:
            pagination["starting_after"] = cursor
        res = request(
            "POST",
            "/conversations/search",
            {"query": {"field": "created_at", "operator": ">", "value": 0}, "pagination": pagination},
        )
        ids.extend(c["id"] for c in res["conversations"])
        cursor = ((res.get("pages") or {}).get("next") or {}).get("starting_after")
        if not cursor:
            break

    target = out / "conversations"
    todo = [i for i in ids if not (target / f"{i}.json").exists()]
    print(f"{len(ids)} conversations, {len(todo)} à télécharger")

    def fetch(conversation_id):
        payload = request("GET", f"/conversations/{conversation_id}?display_as=plaintext")
        write_json(target / f"{conversation_id}.json", payload)

    with ThreadPoolExecutor(max_workers=5) as pool:
        for done, _ in enumerate(pool.map(fetch, todo), start=1):
            if done % 100 == 0:
                print(f"{done}/{len(todo)}")
    print("conversations exportées")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("help-center", "conversations"):
        sys.exit(__doc__)
    out = Path(sys.argv[2]).expanduser()
    {"help-center": export_help_center, "conversations": export_conversations}[sys.argv[1]](out)
