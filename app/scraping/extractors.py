from bs4 import BeautifulSoup
from typing import Dict, List


def extract_text(soup: BeautifulSoup) -> List[Dict[str, str]]:
    parts = []
    for element in soup.find_all(text=True):
        text = element.strip()
        if text:
            parts.append({"text": text})
    return parts


def extract_links(soup: BeautifulSoup) -> List[Dict[str, str]]:
    links = []
    for a in soup.find_all("a", href=True):
        links.append({"text": a.get_text(strip=True), "href": a["href"]})
    return links


def extract_images(soup: BeautifulSoup) -> List[Dict[str, str]]:
    images = []
    for img in soup.find_all("img"):
        src = img.get("src", "")
        alt = img.get("alt", "")
        if src:
            images.append({"src": src, "alt": alt})
    return images


def extract_tables(soup: BeautifulSoup) -> List[Dict[str, str]]:
    tables: List[Dict[str, str]] = []
    for table in soup.find_all("table"):
        rows: List[List[str]] = []
        for tr in table.find_all("tr"):
            cols = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
            if cols:
                rows.append(cols)
        if rows:
            tables.append({"rows": rows})
    return tables
