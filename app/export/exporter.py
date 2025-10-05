from __future__ import annotations
from dataclasses import asdict
from typing import List, Dict, Any
import io
import json
import pandas as pd
import zipfile

from app.scraping.types import ScrapedResult


def to_tabular_rows(result: ScrapedResult) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for item in result.data:
        row = {"url": result.url, "content_type": result.content_type}
        if isinstance(item, dict):
            row.update(item)
        else:
            row["value"] = str(item)
        rows.append(row)
    return rows


def export_results(results: List[ScrapedResult], fmt: str) -> bytes:
    fmt = fmt.lower()
    # Flatten data per content type into separate frames
    by_type: Dict[str, List[Dict[str, Any]]] = {}
    for r in results:
        by_type.setdefault(r.content_type, []).extend(to_tabular_rows(r))

    if fmt == "json":
        payload = [asdict(r) for r in results]
        return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    if fmt == "csv":
        # If multiple content types, zip multiple CSV files
        if len(by_type) == 1:
            (ctype, rows), = by_type.items()
            df = pd.DataFrame(rows)
            return df.to_csv(index=False).encode("utf-8")
        else:
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                for ctype, rows in by_type.items():
                    df = pd.DataFrame(rows)
                    zf.writestr(f"{ctype}.csv", df.to_csv(index=False))
            return buf.getvalue()

    if fmt in ("xlsx", "excel"):
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            for ctype, rows in by_type.items():
                df = pd.DataFrame(rows)
                sheet_name = ctype[:31] if ctype else "data"
                df.to_excel(writer, index=False, sheet_name=sheet_name)
        return buf.getvalue()

    raise ValueError(f"Unsupported export format: {fmt}")
