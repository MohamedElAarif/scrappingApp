from typing import Dict, Any, List
from urllib.parse import urljoin
from bs4 import BeautifulSoup


def extract_text(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    items = []
    for el in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'li']):
        text = el.get_text(strip=True)
        if text:
            items.append({"tag": el.name, "text": text})
    return items


def extract_images(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    items = []
    for img in soup.find_all('img'):
        src = img.get('src') or ""
        alt = img.get('alt') or ""
        if src:
            items.append({"src": urljoin(base_url, src), "alt": alt})
    return items


def extract_links(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    items = []
    for a in soup.find_all('a'):
        href = a.get('href') or ""
        text = a.get_text(strip=True)
        if href:
            items.append({"href": urljoin(base_url, href), "text": text})
    return items


def extract_tables(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    tables = []
    for table in soup.find_all('table'):
        headers = []
        header_row = table.find('tr')
        if header_row:
            for th in header_row.find_all(['th', 'td']):
                headers.append(th.get_text(strip=True))
        rows = []
        for tr in table.find_all('tr')[1:]:
            row = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
            if row:
                rows.append(row)
        tables.append({"headers": headers, "rows": rows})
    return tables
