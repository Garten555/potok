#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Общие утилиты для генерации отчётов по практике (использует practice_report_verbose.py)."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def ensure_docs_dir() -> None:
    out_dir = ROOT / "docs"
    out_dir.mkdir(parents=True, exist_ok=True)


def try_export_pdf_from_html(html_path: Path, pdf_path: Path) -> bool:
    """Печать HTML → PDF через Edge/Chrome headless (как в generate_tz_pdf.py)."""
    possible = [
        shutil.which("msedge"),
        shutil.which("chrome"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    ]
    browser = next((b for b in possible if b and Path(b).exists()), None)
    if not browser:
        return False
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(browser),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        str(html_path.resolve()),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    return result.returncode == 0 and pdf_path.exists()


def _read_file(rel: str, max_lines: int) -> tuple[str, str]:
    path = ROOT / rel.replace("\\", "/")
    if not path.is_file():
        return rel, f"[Файл не найден: {rel}]\n"
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        return rel, f"[Ошибка чтения {rel}: {exc}]\n"
    lines = raw.splitlines()
    total = len(lines)
    if len(lines) > max_lines:
        lines = lines[:max_lines] + [
            "",
            f"— В отчёте обрезано: в файле всего {total} строк. Полный путь: {rel} —",
        ]
    return rel, "\n".join(lines) + "\n"


def _lang_for_path(rel: str) -> str:
    low = rel.lower()
    if low.endswith(".sql"):
        return "sql"
    if low.endswith((".tsx", ".ts")):
        return "typescript"
    if low.endswith(".css"):
        return "css"
    return "text"


def build_code_listings_plain() -> str:
    """Листинги для п. 2.6: SQL модерации, эвристика рекомендаций, API жалоб, фрагменты UI."""
    parts: list[str] = [
        "Ниже — фрагменты исходного кода, подтверждающие описание в пп. 2.1–2.5 (модерация, рекомендации, API).\n\n",
    ]
    chunks: list[tuple[str, str, int]] = [
        ("SQL: миграция модерации и рекомендаций", "web/supabase/15_moderation_recommendations.sql", 100),
        ("TypeScript: эвристика рекомендаций", "web/src/lib/recommendations.ts", 120),
        ("TypeScript: API жалоб", "web/src/app/api/reports/route.ts", 80),
        ("TypeScript: API очереди модерации", "web/src/app/api/moderation/reports/route.ts", 90),
        ("TypeScript/React: комментарии, ответы, жалобы", "web/src/components/watch/comments-section.tsx", 140),
    ]
    for title, rel, max_lines in chunks:
        rel_path, body = _read_file(rel, max_lines)
        lang = _lang_for_path(rel_path)
        # Не используем f-string для body: в коде есть «{» «}», это ломало бы подстановку.
        parts.append(
            "#### "
            + title
            + " (`"
            + rel_path
            + "`)\n\n```"
            + lang
            + "\n"
            + body
            + "```\n\n"
        )
    return "".join(parts)
