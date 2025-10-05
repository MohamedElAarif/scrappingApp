import io
import json
from typing import Dict, Any, List
import pandas as pd


def to_json_bytes(data: Dict[str, Any]) -> bytes:
    return json.dumps(data, indent=2, ensure_ascii=False).encode('utf-8')


def to_csv_bytes(pages: List[Dict[str, Any]]) -> bytes:
    # Flatten pages by content type
    rows = []
    for idx, page in enumerate(pages, start=1):
        for ctype, items in page.items():
            if ctype in ("url", "error"):
                continue
            if isinstance(items, list):
                for item in items:
                    flatted_item = {f"{ctype}_{k}": v for k, v in (item.items() if isinstance(item, dict) else {"value": item}.items())}
                    flatted_item["page_index"] = idx
                    flatted_item["page_url"] = page.get("url", "")
                    rows.append(flatted_item)
    df = pd.DataFrame(rows)
    with io.StringIO() as s:
        df.to_csv(s, index=False)
        return s.getvalue().encode('utf-8')


def to_excel_bytes(pages: List[Dict[str, Any]]) -> bytes:
    with io.BytesIO() as output:
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Write each content type to its own sheet if possible
            # Aggregate across pages
            aggregates: Dict[str, List[Dict[str, Any]]] = {}
            for page in pages:
                for ctype, items in page.items():
                    if ctype in ("url", "error"):
                        continue
                    if isinstance(items, list):
                        list_items = items
                        aggregates.setdefault(ctype, [])
                        for item in list_items:
                            if isinstance(item, dict):
                                aggregates[ctype].append({**item, "page_url": page.get("url", "")})
                            else:
                                aggregates[ctype].append({"value": item, "page_url": page.get("url", "")})
            if not aggregates:
                pd.DataFrame([{"message": "No data"}]).to_excel(writer, sheet_name='data', index=False)
            else:
                for sheet, rows in aggregates.items():
                    pd.DataFrame(rows).to_excel(writer, sheet_name=sheet[:31], index=False)
        return output.getvalue()
