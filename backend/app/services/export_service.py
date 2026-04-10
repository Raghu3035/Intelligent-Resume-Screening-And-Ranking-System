# app/services/export_service.py
"""
Export Service
Generates CSV and PDF reports from candidate results.
"""

import io
import csv
import datetime
from typing import List


def generate_csv(candidates: List[dict]) -> bytes:
    """Generate CSV bytes from candidate list."""
    output = io.StringIO()
    if not candidates:
        return b"No data"

    fieldnames = [
        "rank", "name", "email", "match_score", "skill_score",
        "experience_score", "experience", "education",
        "matched_skills", "missing_skills", "filename"
    ]

    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for c in candidates:
        row = {k: c.get(k, "") for k in fieldnames}
        # Convert lists to comma-separated strings
        if isinstance(row.get("matched_skills"), list):
            row["matched_skills"] = ", ".join(row["matched_skills"])
        if isinstance(row.get("missing_skills"), list):
            row["missing_skills"] = ", ".join(row["missing_skills"])
        writer.writerow(row)

    return output.getvalue().encode("utf-8")


def generate_pdf_report(candidates: List[dict], job_description: str = "") -> bytes:
    """Generate PDF report using reportlab."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph,
            Spacer, HRFlowable
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        styles = getSampleStyleSheet()

        elements = []

        # Title
        title_style = ParagraphStyle(
            "Title", parent=styles["Heading1"],
            fontSize=18, textColor=colors.HexColor("#4F46E5"),
            spaceAfter=6
        )
        elements.append(Paragraph("Resume Screening Report", title_style))
        elements.append(Paragraph(
            f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 0.2*inch))

        if job_description:
            elements.append(Paragraph("Job Description:", styles["Heading3"]))
            jd_text = job_description[:300] + ("..." if len(job_description) > 300 else "")
            elements.append(Paragraph(jd_text, styles["Normal"]))
            elements.append(Spacer(1, 0.2*inch))

        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB")))
        elements.append(Spacer(1, 0.1*inch))

        # Table
        headers = ["Rank", "Name", "Score", "Matched Skills", "Missing Skills", "Exp (yrs)"]
        table_data = [headers]

        for c in candidates[:50]:  # Limit to 50 rows
            matched = ", ".join(c.get("matched_skills", [])[:5])
            missing = ", ".join(c.get("missing_skills", [])[:3])
            table_data.append([
                str(c.get("rank", "")),
                c.get("name", "")[:25],
                f"{c.get('match_score', 0):.1f}%",
                matched[:40],
                missing[:30],
                str(c.get("experience", 0)),
            ])

        col_widths = [0.5*inch, 1.5*inch, 0.8*inch, 2*inch, 1.5*inch, 0.7*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("ALIGN", (2, 0), (2, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))

        elements.append(table)
        doc.build(elements)
        return buffer.getvalue()

    except ImportError:
        # Fallback: return CSV as bytes if reportlab not available
        return generate_csv(candidates)
