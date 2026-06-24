"""Central configuration for the RAG ingestion pipeline (env-driven)."""
from __future__ import annotations
import os
from dotenv import load_dotenv

# Load repo-root .env (this file lives in ingestion/).
load_dotenv(os.path.join(os.path.dirname(__file__), os.pardir, ".env"))

HERE = os.path.dirname(__file__)
SOURCES_DIR = os.path.join(HERE, "sources")

# ── Models / API ──────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
# ⚠ pgvector ivf/hnsw indexes cap at ~2000 dims — keep 1536 unless you migrate the
# column to halfvec(3072). The DB column is vector(1536); keep these in sync.
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
EMBED_BATCH = int(os.getenv("EMBED_BATCH", "64"))

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── Chunking ──────────────────────────────────────────────────────────────────
CHUNK_TARGET_TOKENS = int(os.getenv("CHUNK_TARGET_TOKENS", "700"))
CHUNK_OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "120"))

# ── Per-document profile (title + equipment line), matched by file-name substring.
# Extend this as new PDFs are added to sources/.
DOC_PROFILES: list[dict] = [
    {"match": "w22-manual",          "title": "Manual de Instalação, Operação e Manutenção — Motores W22 (HGF/W50/W40)", "equipment_line": "W22"},
    {"match": "guia-pratico",        "title": "Guia Prático de Treinamento Técnico-Comercial — Motores Elétricos",       "equipment_line": "geral"},
    {"match": "redimensionamento",   "title": "Considerações sobre Redimensionamento de Motores de Indução",              "equipment_line": "geral"},
    {"match": "manual geral de eletrica", "title": "Manual Geral de Elétrica",                                            "equipment_line": "geral"},
    {"match": "planos_de_pintura",   "title": "Planos de Pintura × Corrosividade Ambiental (TN04)",                       "equipment_line": "geral"},
    {"match": "tn04",                "title": "Planos de Pintura × Corrosividade Ambiental (TN04)",                       "equipment_line": "geral"},
]
DEFAULT_PROFILE = {"title": None, "equipment_line": "geral"}

# Topic inference (chunk-level), first match wins. Keep keywords lowercase.
TOPIC_KEYWORDS: list[tuple[str, list[str]]] = [
    ("lubrificacao",     ["relubrific", "lubrific", "graxa", "rolamento", "mancal"]),
    ("isolamento",       ["isolament", "megôhmetro", "megohmetro", "resistência de isolamento", "dielétric", "classe f", "classe h"]),
    ("vibracao",         ["vibraç", "severidade", "mm/s"]),
    ("pintura",          ["pintura", "corrosiv", "iso 12944", "iso 14713", " c1", " c2", " c3", " c4", " c5", " cx"]),
    ("redimensionamento",["redimension", "% de carga", "fator de potência", "rendimento", "fator de serviço"]),
    ("placa",            ["placa de identificação", "dados de placa", "leitura da placa"]),
    ("temperatura",      ["pt-100", "pt100", "termorresist", "temperatura do enrolamento"]),
    ("protecao",         ["grau de proteção", "ip55", "ip54", "ip56", "índice de proteção"]),
    ("torque",           ["torque", "aperto", "n.m", "nm "]),
]


def profile_for(file_name: str) -> dict:
    low = file_name.lower()
    for p in DOC_PROFILES:
        if p["match"] in low:
            return p
    return {**DEFAULT_PROFILE, "title": file_name}


def infer_topic(text: str) -> str:
    low = text.lower()
    for topic, kws in TOPIC_KEYWORDS:
        if any(k in low for k in kws):
            return topic
    return "geral"
