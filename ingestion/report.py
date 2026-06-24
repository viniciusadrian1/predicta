"""Pretty ingestion report."""
from __future__ import annotations


def render_report(stats: dict) -> str:
    lines = [
        "",
        "═══════════════════════════════════════════════════════",
        " Predicta · Relatório de Ingestão (RAG)",
        "═══════════════════════════════════════════════════════",
        f" Documentos encontrados : {stats['docs_found']}",
        f" Documentos ingeridos   : {stats['docs_ingested']}",
        f" Documentos pulados     : {stats['docs_skipped']} (hash inalterado)",
        f" Chunks gravados        : {stats['chunks']}",
        f"   • tabelas            : {stats['tables']}",
        f"   • texto              : {stats['text']}",
        f"   • legendas de figura : {stats['figures']}",
        f" Tokens estimados (emb) : ~{stats['tokens']:,}",
        "───────────────────────────────────────────────────────",
    ]
    for d in stats.get("per_doc", []):
        flag = "skip" if d["skipped"] else f"{d['chunks']} chunks ({d['tables']} tab)"
        lines.append(f"  • {d['file_name'][:48]:48s} {flag}")
    lines.append("═══════════════════════════════════════════════════════")
    return "\n".join(lines)
