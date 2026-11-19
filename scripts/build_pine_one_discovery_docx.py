#!/usr/bin/env python3
"""Build a polished Google Docs-compatible DOCX from the Pine One discovery Markdown."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


NAVY = "123A5A"
BLUE = "0B6FA4"
TEAL = "0E7C7B"
INK = "23313F"
MUTED = "64748B"
PALE_BLUE = "EAF4F8"
PALE_GRAY = "F4F7F9"
LINE = "D7E1E8"
WHITE = "FFFFFF"


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_repeat_on_each_page(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    keep_next = OxmlElement("w:keepNext")
    keep_next.set(qn("w:val"), "1")
    p_pr.append(keep_next)


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MUTED)
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char1, instr_text, fld_char2])


def set_run_font(run, size=None, bold=None, color=None, italic=None, name="Arial") -> None:
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    if italic is not None:
        run.italic = italic


def add_inline_markdown(paragraph, text: str, *, base_size=10.5, base_color=INK) -> None:
    """Render bold Markdown while preserving the rest as plain text."""
    parts = re.split(r"(\*\*.*?\*\*)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            set_run_font(run, size=base_size, bold=True, color=NAVY)
        else:
            run = paragraph.add_run(part)
            set_run_font(run, size=base_size, color=base_color)


def add_paragraph(doc, text: str, style=None, before=0, after=5, line_spacing=1.08):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = line_spacing
    add_inline_markdown(p, text)
    return p


def add_markdown_table(doc, lines: list[str]) -> None:
    rows = []
    for line in lines:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append(cells)
    if len(rows) >= 2 and all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in rows[1]):
        rows.pop(1)
    if not rows:
        return
    col_count = max(len(r) for r in rows)
    table = doc.add_table(rows=len(rows), cols=col_count)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    set_repeat_table_header(table.rows[0])
    for row_index, row_data in enumerate(rows):
        row = table.rows[row_index]
        prevent_row_split(row)
        for col_index in range(col_count):
            cell = row.cells[col_index]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            if row_index == 0:
                set_cell_shading(cell, NAVY)
            elif row_index % 2 == 0:
                set_cell_shading(cell, PALE_GRAY)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            value = row_data[col_index] if col_index < len(row_data) else ""
            add_inline_markdown(p, value, base_size=8.5, base_color=WHITE if row_index == 0 else INK)
            if row_index == 0:
                for run in p.runs:
                    run.bold = True
                    run.font.color.rgb = RGBColor.from_string(WHITE)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)


def build_document(markdown_path: Path, output_path: Path) -> None:
    lines = markdown_path.read_text(encoding="utf-8").splitlines()
    if not lines or not lines[0].startswith("# "):
        raise ValueError("Expected Markdown title on the first line")

    source_title = lines[0][2:].strip()
    title = source_title.replace("—", "").replace("-", " ")
    title = re.sub(r"\s+", " ", title).strip()

    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.68)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.08

    for style_name, size, color, before, after in (
        ("Title", 26, NAVY, 0, 10),
        ("Heading 1", 17, NAVY, 16, 7),
        ("Heading 2", 11, TEAL, 9, 4),
        ("Heading 3", 10.5, TEAL, 8, 3),
    ):
        style = styles[style_name]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    for list_style in ("List Bullet", "List Number"):
        style = styles[list_style]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        style.font.size = Pt(10)
        style.font.color.rgb = RGBColor.from_string(INK)
        style.paragraph_format.space_after = Pt(3.5)
        style.paragraph_format.line_spacing = 1.05

    if "Document Meta" not in styles:
        meta_style = styles.add_style("Document Meta", WD_STYLE_TYPE.PARAGRAPH)
        meta_style.font.name = "Arial"
        meta_style._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
        meta_style.font.size = Pt(9.5)
        meta_style.font.color.rgb = RGBColor.from_string(MUTED)

    # Cover page
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(22)
    run = p.add_run("PINE ONE")
    set_run_font(run, size=10, bold=True, color=TEAL)

    p = doc.add_paragraph(style="Title")
    p.paragraph_format.space_before = Pt(30)
    p.add_run(title)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(20)
    run = p.add_run("Cross platform product and UX discovery for web and mobile")
    set_run_font(run, size=13, color=MUTED)

    # Short framing statement from the document, presented as a shaded paragraph.
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.12)
    p.paragraph_format.right_indent = Inches(0.12)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(20)
    p.paragraph_format.line_spacing = 1.08
    p_pr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), PALE_BLUE)
    p_pr.append(shd)
    run = p.add_run(
        "  Pine One gives merchants one reliable place to understand and manage "
        "in-store and online payments across mobile and web."
    )
    set_run_font(run, size=12, bold=True, color=NAVY)

    p = doc.add_paragraph(style="Document Meta")
    p.paragraph_format.space_before = Pt(28)
    p.add_run("Last updated  1 October 2026\n")
    p.add_run("Status  Working discovery document\n")
    p.add_run("Platforms  Pine One web and Pine One mobile app")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    run = p.add_run(
        "This document consolidates stakeholder inputs with evidence from the current prototypes. "
        "It establishes the cross-platform product model and records the decisions still required."
    )
    set_run_font(run, size=10, color=MUTED)

    doc.add_page_break()

    # Compact contents page to make the long discovery report navigable in Google Docs.
    h = doc.add_paragraph("Contents", style="Heading 1")
    h.paragraph_format.space_before = Pt(0)
    contents = [
        "1  Purpose",
        "2  Working product definition",
        "3  Scope",
        "4  Product and account model",
        "5  Information architecture established by the prototype",
        "6  Consolidated discovery answers",
        "7  Cross platform capability model inferred from the prototype",
        "8  Decisions and conflicts requiring resolution",
        "9  Recommended documentation set",
    ]
    for entry in contents:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.1)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(entry)
        set_run_font(run, size=10.5, color=INK)
    doc.add_page_break()

    # Body (metadata already represented on the cover).
    i = 1
    in_code = False
    code_lines: list[str] = []
    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        if i <= 4 and (stripped.startswith("Last updated:") or stripped.startswith("Status:") or stripped.startswith("Platforms:")):
            i += 1
            continue
        if stripped.startswith("```"):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Inches(0.18)
                p.paragraph_format.right_indent = Inches(0.18)
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(8)
                p.paragraph_format.keep_together = True
                run = p.add_run("\n".join(code_lines))
                set_run_font(run, size=8.5, color=INK, name="Courier New")
                p_pr = p._p.get_or_add_pPr()
                shd = OxmlElement("w:shd")
                shd.set(qn("w:fill"), PALE_GRAY)
                p_pr.append(shd)
                in_code = False
            i += 1
            continue
        if in_code:
            code_lines.append(raw)
            i += 1
            continue
        if not stripped:
            i += 1
            continue
        if stripped.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i].strip())
                i += 1
            add_markdown_table(doc, table_lines)
            continue
        if stripped.startswith("### "):
            doc.add_paragraph(stripped[4:].strip(), style="Heading 2")
        elif stripped.startswith("## "):
            doc.add_paragraph(stripped[3:].strip(), style="Heading 1")
        elif stripped.startswith("# "):
            pass
        elif re.match(r"^-\s+", stripped):
            p = doc.add_paragraph(style="List Bullet")
            add_inline_markdown(p, re.sub(r"^-\s+", "", stripped), base_size=10)
        elif re.match(r"^\d+\.\s+", stripped):
            # Keep the explicit discovery answer number as part of the text so 1–100 remain stable.
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.24)
            p.paragraph_format.first_line_indent = Inches(-0.24)
            p.paragraph_format.space_after = Pt(4.5)
            p.paragraph_format.line_spacing = 1.05
            match = re.match(r"^(\d+\.)\s+(.*)$", stripped)
            num_run = p.add_run(match.group(1) + "  ")
            set_run_font(num_run, size=10, bold=True, color=TEAL)
            add_inline_markdown(p, match.group(2), base_size=10)
        else:
            add_paragraph(doc, stripped)
        i += 1

    # Header/footer for all sections.
    for sec in doc.sections:
        header = sec.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run = hp.add_run("PINE ONE  |  CROSS PLATFORM DISCOVERY")
        set_run_font(run, size=7.5, bold=True, color=MUTED)
        footer = sec.footer
        fp = footer.paragraphs[0]
        add_page_number(fp)

    # Document metadata.
    props = doc.core_properties
    props.title = title
    props.subject = "Cross platform product and UX discovery findings"
    props.author = "Pine Labs"
    props.keywords = "Pine One, payments, merchant, web, mobile, product discovery, UX"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build_pine_one_discovery_docx.py INPUT.md OUTPUT.docx")
    build_document(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
