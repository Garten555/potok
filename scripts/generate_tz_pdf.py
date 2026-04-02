#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генерация оформленного PDF из TECH_SPEC.md (проект POTOK)."""

from __future__ import annotations

import html
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "TECH_SPEC.md"
OUT_HTML = ROOT / "docs" / "tehnicheskoe_zadanie_potok.html"
OUT_PDF = ROOT / "docs" / "tehnicheskoe_zadanie_potok.pdf"


def inline_format(text: str) -> str:
    """**жирный**, `код` — после экранирования разметки."""
    s = html.escape(text)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`([^`]+)`", r'<code class="inline">\1</code>', s)
    return s


def md_to_html(md_text: str) -> str:
    lines = md_text.splitlines()
    body_parts: list[str] = []
    i = 0
    in_code = False
    code_lines: list[str] = []

    def flush_paragraph(buf: list[str]) -> None:
        if not buf:
            return
        text = " ".join(buf)
        body_parts.append(f"<p>{inline_format(text)}</p>")
        buf.clear()

    para_buf: list[str] = []

    while i < len(lines):
        line = lines[i]
        raw = line.rstrip("\n")

        if raw.strip() == "```":
            if in_code:
                flush_paragraph(para_buf)
                escaped = html.escape("\n".join(code_lines))
                body_parts.append(f'<pre class="code-block"><code>{escaped}</code></pre>')
                code_lines = []
                in_code = False
            else:
                flush_paragraph(para_buf)
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(raw)
            i += 1
            continue

        s = raw.strip()
        if not s:
            flush_paragraph(para_buf)
            i += 1
            continue

        if s.startswith("# "):
            flush_paragraph(para_buf)
            body_parts.append(f"<h1>{inline_format(s[2:])}</h1>")
            i += 1
            continue
        if s.startswith("## "):
            flush_paragraph(para_buf)
            body_parts.append(f"<h2>{inline_format(s[3:])}</h2>")
            i += 1
            continue
        if s.startswith("### "):
            flush_paragraph(para_buf)
            body_parts.append(f"<h3>{inline_format(s[4:])}</h3>")
            i += 1
            continue

        if s.startswith("- "):
            flush_paragraph(para_buf)
            items = []
            while i < len(lines):
                ls = lines[i].strip()
                if ls.startswith("- "):
                    items.append(f"<li>{inline_format(ls[2:])}</li>")
                    i += 1
                else:
                    break
            body_parts.append("<ul>" + "".join(items) + "</ul>")
            continue

        para_buf.append(s)
        i += 1

    flush_paragraph(para_buf)

    body_html = "\n".join(body_parts)

    # Системные шрифты (без загрузки с сети): headless Chrome/Edge часто не подтягивает
    # Google Fonts, из‑за чего кириллица в PDF превращается в «?».
    # Системные шрифты (без сети): кириллица в PDF через Edge/Chrome headless.
    css = """
:root {
  --ink: #0c1222;
  --muted: #5c6b7a;
  --line: #c5d0dc;
  --surface: #f4f7fb;
  --accent: #0b6e8c;
  --accent-bright: #1496b8;
  --accent-soft: #d9f0f7;
  --header-deep: #062535;
}

* { box-sizing: border-box; }

@page {
  size: A4;
  margin: 14mm 12mm 16mm 12mm;
}

html {
  font-size: 15px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  margin: 0;
  font-family: "Segoe UI", "Cambria", "Georgia", "Times New Roman", serif;
  color: var(--ink);
  background: linear-gradient(160deg, var(--header-deep) 0%, #152a3d 38%, #e8eef4 38%);
  min-height: 100vh;
  padding: 2rem 1rem 2.5rem;
}

.sheet {
  max-width: 210mm;
  margin: 0 auto;
  background: #fff;
  box-shadow:
    0 4px 6px rgba(12, 18, 34, 0.06),
    0 22px 48px rgba(15, 23, 42, 0.14);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.doc-header {
  position: relative;
  background:
    linear-gradient(118deg, rgba(255, 255, 255, 0.07) 0%, transparent 45%),
    linear-gradient(135deg, #063a52 0%, #0a5f7a 42%, var(--accent-bright) 100%);
  color: #f0fafc;
  padding: 2.4rem 2.6rem 2.1rem;
  border-bottom: 3px solid rgba(255, 255, 255, 0.22);
}

.doc-header::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: linear-gradient(90deg, #7dd3fc 0%, #38bdf8 35%, rgba(255, 255, 255, 0.35) 100%);
  opacity: 0.9;
}

.doc-header .label {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.88;
  font-weight: 600;
  margin-bottom: 0.45rem;
}

.doc-header h1.title {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 1.75rem;
  font-weight: 650;
  margin: 0 0 0.35rem;
  line-height: 1.2;
  border: none;
  letter-spacing: -0.02em;
}

.doc-header .meta {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 0.9rem;
  opacity: 0.94;
  margin-top: 0.85rem;
  line-height: 1.55;
}

.doc-header .meta strong { font-weight: 600; }

.content {
  padding: 2.1rem 2.4rem 2.6rem;
}

.content h1 {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 1.38rem;
  margin: 0 0 0.85rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid var(--accent);
  color: var(--accent);
  page-break-after: avoid;
}

.content h2 {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 1.08rem;
  margin: 1.65rem 0 0.55rem;
  color: #0a4a5c;
  font-weight: 650;
  padding: 0.35rem 0 0.35rem 0.75rem;
  border-left: 4px solid var(--accent-bright);
  background: linear-gradient(90deg, var(--accent-soft) 0%, transparent 88%);
  page-break-after: avoid;
}

.content h3 {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 0.98rem;
  margin: 1.15rem 0 0.4rem;
  color: #334e5c;
  font-weight: 600;
  page-break-after: avoid;
}

.content p {
  margin: 0.48rem 0;
  line-height: 1.68;
  text-align: justify;
  hyphens: auto;
  orphans: 3;
  widows: 3;
}

.content ul {
  margin: 0.4rem 0 0.7rem;
  padding-left: 1.2rem;
}

.content li {
  margin: 0.26rem 0;
  line-height: 1.58;
  padding-left: 0.15rem;
}

.content li::marker {
  color: var(--accent);
}

code.inline {
  font-family: Consolas, "Courier New", "Lucida Console", monospace;
  font-size: 0.86em;
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 0.1em 0.38em;
  border-radius: 4px;
  color: #0b1f2a;
}

pre.code-block {
  font-family: Consolas, "Courier New", "Lucida Console", monospace;
  font-size: 0.8rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent-bright);
  border-radius: 6px;
  padding: 0.9rem 1.05rem;
  overflow-x: auto;
  line-height: 1.48;
  margin: 0.8rem 0;
}

.doc-footer {
  margin-top: 2rem;
  padding: 1.1rem 2.4rem 1.6rem;
  border-top: 1px solid var(--line);
  font-size: 0.8rem;
  color: var(--muted);
  background: linear-gradient(180deg, #fafcfd 0%, #fff 100%);
  line-height: 1.5;
}

@media print {
  body {
    background: #fff;
    padding: 0;
  }
  .sheet {
    box-shadow: none;
    max-width: none;
    border: none;
    border-radius: 0;
  }
  .content h2 {
    break-inside: avoid;
  }
}
"""

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Техническое задание — POTOK</title>
<style>
{css}
</style>
</head>
<body>
<div class="sheet">
  <header class="doc-header">
    <div class="label">Документ проектной документации</div>
    <h1 class="title">Техническое задание</h1>
    <div class="meta">
      <strong>Проект:</strong> POTOK — веб-платформа публикации и просмотра видео<br />
      <strong>Формат:</strong> PDF
    </div>
  </header>
  <article class="content">
{body_html}
  </article>
  <footer class="doc-footer content">
    Документ сформирован автоматически из репозитория проекта. При расхождении с актуальной разработкой ориентируйтесь на кодовую базу и согласованные изменения ТЗ.
  </footer>
</div>
</body>
</html>"""


def export_pdf(html_path: Path, pdf_path: Path) -> bool:
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


def main() -> None:
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    md = SRC.read_text(encoding="utf-8")
    lines = md.splitlines()
    # Первый заголовок дублирует шапку документа — убираем
    if lines and lines[0].startswith("# "):
        md = "\n".join(lines[1:]).lstrip("\n")
    html_out = md_to_html(md)
    OUT_HTML.write_text(html_out, encoding="utf-8")
    if export_pdf(OUT_HTML, OUT_PDF):
        print(f"PDF: {OUT_PDF}")
    else:
        print(
            "PDF: не удалось (нет Edge/Chrome). Откройте сгенерированный файл в папке docs "
            "в браузере и выполните Печать → Сохранить как PDF."
        )


if __name__ == "__main__":
    main()
