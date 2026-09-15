#!/usr/bin/env python3
"""Agrège le classement des conversations en synthèse Markdown.

    python3 scripts/analyse_conversations.py <dossier-digest> > synthese.md

Lit les `lot-XX.jsonl` (conversations anonymisées) et les `classement-lot-XX.jsonl`
(une ligne de classement par conversation), vérifie que chaque conversation est classée,
puis sort les volumes par thème et les questions récurrentes qu'aucun article ne couvre.

La synthèse reprend les reformulations du classement, jamais le texte des conversations.
"""

import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}")


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def pct(n, total):
    return f"{round(100 * n / total)} %" if total else "—"


def article_status(digest):
    """Associe un chemin d'article à son état le jour d'une conversation.

    L'export du Help Center est rangé à côté du digest (`../help-center/articles.json`),
    et chaque fichier Markdown garde l'identifiant de son article d'origine.
    """
    exported = {a["id"]: a for a in json.loads((digest.parent / "help-center" / "articles.json").read_text())}
    by_path = {}
    for md in (ROOT / "articles").rglob("*.md"):
        found = re.search(r'^intercom_us_id: "(\d+)"', md.read_text(), re.M)
        if found and found.group(1) in exported:
            by_path[str(md.relative_to(ROOT / "articles"))] = exported[found.group(1)]

    def status(path, day):
        article = by_path.get(path)
        if not article or article["state"] != "published":
            return "brouillon"
        created = datetime.fromisoformat(article_day(article["created_at"]))
        return "publié après" if day and datetime.fromisoformat(day) < created else "publié avant"

    return status


def article_day(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d")


def main(digest):
    expected, rows, dates = set(), [], {}
    for lot in sorted(digest.glob("lot-*.jsonl")):
        conversations = read_jsonl(lot)
        expected |= {r["id"] for r in conversations}
        dates |= {r["id"]: r["date"] for r in conversations}
        out = digest / f"classement-{lot.name}"
        if out.exists():
            rows += read_jsonl(out)

    by_id = {r["id"]: r for r in rows}
    missing = expected - by_id.keys()
    rows = list(by_id.values())
    total = len(rows)
    # Hors `id` : un identifiant de conversation à dix chiffres ressemble à un numéro de téléphone.
    texts = lambda r: " ".join(str(v) for k, v in r.items() if k != "id")
    leaks = [r["id"] for r in rows if EMAIL.search(texts(r)) or PHONE.search(texts(r))]

    p = print
    p("# Questions du support — espace Intercom US\n")
    p(f"{total} conversations classées sur {len(expected)}.")
    if missing:
        p(f"\n⚠️ {len(missing)} conversations non classées.")
    if leaks:
        p(f"\n⚠️ {len(leaks)} lignes contiennent encore un e-mail ou un téléphone : {leaks[:10]}")

    documentable = [r for r in rows if r.get("documentable")]
    uncovered = [r for r in documentable if not r.get("article_existant")]
    p(f"\n- Auraient pu être évitées par un article : **{len(documentable)}** ({pct(len(documentable), total)})")
    p(f"- … dont sans article existant : **{len(uncovered)}**")
    p(f"- … dont rattachées à un article existant : **{len(documentable) - len(uncovered)}** (voir « Articles existants rattachés »)")

    for field, title in (("theme", "Thème"), ("nature", "Nature"), ("role_demandeur", "Demandeur")):
        p(f"\n## Par {title.lower()}\n\n| {title} | Conversations | Documentables |\n|---|---|---|")
        counts, docs = Counter(r.get(field) for r in rows), Counter(r.get(field) for r in documentable)
        for key, n in counts.most_common():
            p(f"| {key} | {n} | {docs[key]} |")

    groups = defaultdict(list)
    for r in uncovered:
        groups[(r.get("theme"), r.get("sous_theme"))].append(r)
    p("\n## Articles manquants, par fréquence\n\nQuestions documentables qu'aucun article ne couvre.\n")
    for (theme, sub), items in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        if len(items) < 2:
            continue
        roles = ", ".join(f"{k} {v}" for k, v in Counter(i.get("role_demandeur") for i in items).most_common())
        p(f"### {sub} — {len(items)} ({theme})\n\nDemandeurs : {roles}\n")
        for i in items[:4]:
            p(f"- {i.get('question')}  \n  → {i.get('reponse')}")
        p()

    # Un article rattaché n'a « échoué » que s'il était publié le jour de la conversation :
    # un brouillon, ou un article écrit après coup, était invisible pour l'utilisateur.
    status = article_status(digest)
    visibility = defaultdict(Counter)
    for r in documentable:
        if r.get("article_existant"):
            visibility[r["article_existant"]][status(r["article_existant"], dates.get(r["id"]))] += 1
    totals = sum(visibility.values(), Counter())
    p("## Articles existants rattachés\n")
    p(f"- Brouillon, invisible : **{totals['brouillon']}**")
    p(f"- Publié après la conversation : **{totals['publié après']}**")
    p(f"- Publié et disponible, sans suffire : **{totals['publié avant']}**\n")
    p("| Article | Brouillon | Publié après | Publié avant |\n|---|---|---|---|")
    for path, c in sorted(visibility.items(), key=lambda kv: -sum(kv[1].values())):
        p(f"| {path} | {c['brouillon']} | {c['publié après']} | {c['publié avant']} |")

    action = Counter(r.get("sous_theme") for r in rows if r.get("nature") == "action-sur-compte")
    p("\n## Demandes où le support doit agir lui-même\n\nUn article n'y suffit pas : c'est du produit.\n\n| Sous-thème | Conversations |\n|---|---|")
    for sub, n in action.most_common(15):
        p(f"| {sub} | {n} |")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).expanduser())
