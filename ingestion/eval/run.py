#!/usr/bin/env python3
"""Evaluate the RAG endpoint against the golden set.

    python eval/run.py                       # hits $ASSISTANT_RAG_URL (the Edge Function)
    python eval/run.py --retrieval-only      # checks retrieval only (no LLM), via match_hybrid

Reports, per case: source recovered? exact value present? citation present? and the
honesty cases (must answer "não encontrei"). Exit code != 0 if any case fails.
"""
from __future__ import annotations
import argparse
import json
import os
import sys

HERE = os.path.dirname(__file__)


def load_golden() -> dict:
    with open(os.path.join(HERE, "golden.json"), encoding="utf-8") as f:
        return json.load(f)


def check_contains(text: str, needles: list[str], any_mode: bool) -> bool:
    low = (text or "").lower()
    hits = [n for n in needles if n.lower() in low]
    return bool(hits) if any_mode else len(hits) == len(needles)


def call_endpoint(query: str) -> dict:
    import urllib.request
    url = os.environ["ASSISTANT_RAG_URL"]
    headers = {"content-type": "application/json"}
    if os.getenv("SUPABASE_ANON_KEY"):
        headers["authorization"] = f"Bearer {os.environ['SUPABASE_ANON_KEY']}"
        headers["apikey"] = os.environ["SUPABASE_ANON_KEY"]
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--retrieval-only", action="store_true")
    args = ap.parse_args()

    golden = load_golden()
    passed = 0
    total = 0

    for case in golden["cases"]:
        total += 1
        any_mode = case.get("match_any_must_contain", False) or case.get("out_of_corpus", False)
        try:
            if args.retrieval_only:
                # Retrieval-only: embed + match_hybrid, then check the returned chunks.
                from _retrieval_check import retrieve
                chunks = retrieve(case["query"])
                joined = " ".join(c["content"] for c in chunks)
                src = " ".join(json.dumps(c["metadata"], ensure_ascii=False) for c in chunks)
                value_ok = check_contains(joined, case.get("must_contain", []), any_mode)
                source_ok = check_contains(src, case.get("expect_source_contains", []), False) if not case.get("out_of_corpus") else True
                ok = value_ok and source_ok
                detail = f"value={'ok' if value_ok else 'MISS'} source={'ok' if source_ok else 'MISS'}"
            else:
                res = call_endpoint(case["query"])
                answer = res.get("answer", "")
                cites = res.get("citations", [])
                if case.get("out_of_corpus"):
                    ok = check_contains(answer, case["must_contain"], True)
                    detail = f"honest={'ok' if ok else 'FABRICOU?'} conf={res.get('confidence')}"
                else:
                    value_ok = check_contains(answer, case.get("must_contain", []), any_mode)
                    cite_ok = len(cites) > 0
                    src_blob = " ".join(json.dumps(c, ensure_ascii=False) for c in cites)
                    source_ok = check_contains(src_blob, case.get("expect_source_contains", []), False)
                    ok = value_ok and cite_ok and source_ok
                    detail = f"value={'ok' if value_ok else 'MISS'} cite={'ok' if cite_ok else 'MISS'} source={'ok' if source_ok else 'MISS'} conf={res.get('confidence')}"
        except Exception as e:  # noqa: BLE001
            ok, detail = False, f"erro: {e}"

        passed += int(ok)
        print(f"[{'PASS' if ok else 'FAIL'}] {case['id']:32s} {detail}")

    print(f"\n{passed}/{total} casos OK")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
